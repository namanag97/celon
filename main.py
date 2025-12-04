"""
Process Mining Application - FastAPI Backend
"""

import uuid
import io
from typing import Dict, Any, List, Optional
from datetime import timedelta

import pandas as pd
import pm4py
from pm4py.statistics.traces.generic.log import case_statistics
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# In-memory storage for event logs keyed by session_id
event_log_store: Dict[str, Any] = {}

app = FastAPI(
    title="Process Mining API",
    description="Backend API for process mining application",
    version="1.0.0",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UploadResponse(BaseModel):
    """Response model for file upload."""
    session_id: str
    case_count: int
    event_count: int
    activities: list[str]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Process Mining API is running"}


@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an event log file for process mining analysis.
    
    Accepts CSV or XES format event logs.
    
    For CSV files, the following columns are required:
    - case_id: Unique identifier for each case/trace
    - activity: The activity/event name
    - timestamp: Timestamp of the event
    
    Returns session_id, case_count, event_count, and list of activities.
    """
    filename = file.filename.lower() if file.filename else ""
    
    # Validate file extension
    if not (filename.endswith('.csv') or filename.endswith('.xes')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only CSV and XES files are supported."
        )
    
    try:
        content = await file.read()
        
        if filename.endswith('.csv'):
            # Parse CSV file
            df = pd.read_csv(io.BytesIO(content))
            
            # Validate required columns
            required_columns = {'case_id', 'activity', 'timestamp'}
            missing_columns = required_columns - set(df.columns)
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"CSV file missing required columns: {', '.join(missing_columns)}. "
                           f"Required columns are: case_id, activity, timestamp"
                )
            
            # Convert timestamp column to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Format dataframe for pm4py
            df = pm4py.format_dataframe(
                df,
                case_id='case_id',
                activity_key='activity',
                timestamp_key='timestamp'
            )
            
            # Convert to event log
            event_log = pm4py.convert_to_event_log(df)
            
        else:  # XES file
            # Save content to temporary bytes buffer and read with pm4py
            event_log = pm4py.read_xes(io.BytesIO(content))
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store event log in memory
        event_log_store[session_id] = {
            'event_log': event_log,
            'filename': file.filename
        }
        
        # Calculate statistics
        case_count = len(event_log)
        event_count = sum(len(trace) for trace in event_log)
        
        # Get unique activities
        activities = set()
        for trace in event_log:
            for event in trace:
                activities.add(event['concept:name'])
        activities_list = sorted(list(activities))
        
        return UploadResponse(
            session_id=session_id,
            case_count=case_count,
            event_count=event_count,
            activities=activities_list
        )
        
    except HTTPException:
        raise
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing file: {str(e)}"
        )


class DiscoverResponse(BaseModel):
    """Response model for process discovery."""
    nodes: list[dict]
    edges: list[dict]


@app.get("/discover/{session_id}", response_model=DiscoverResponse)
async def discover_process(session_id: str):
    """
    Discover process model from uploaded event log using DFG algorithm.

    Returns the discovered process model in Cytoscape.js format:
    - nodes: [{data: {id, label, frequency, isStart, isEnd}}]
    - edges: [{data: {source, target, weight}}]
    """
    if session_id not in event_log_store:
        raise HTTPException(status_code=404, detail="Session not found")

    event_log = event_log_store[session_id]['event_log']

    # Discover DFG using pm4py
    dfg, start_activities, end_activities = pm4py.discover_dfg(event_log)

    # Calculate activity frequencies from event log
    activity_frequencies: Dict[str, int] = {}
    for trace in event_log:
        for event in trace:
            act_name = event['concept:name']
            activity_frequencies[act_name] = activity_frequencies.get(act_name, 0) + 1

    # Collect all activities from DFG and start/end activities
    activities = set()
    for (source, target) in dfg:
        activities.add(source)
        activities.add(target)
    activities.update(start_activities.keys())
    activities.update(end_activities.keys())

    # Prepare Cytoscape elements
    nodes = []
    edges = []

    # Add activity nodes with frequency and start/end flags
    for act in activities:
        nodes.append({
            "data": {
                "id": act,
                "label": act,
                "frequency": activity_frequencies.get(act, 0),
                "isStart": act in start_activities,
                "isEnd": act in end_activities
            }
        })

    # Add Start node (marked with special flag)
    nodes.append({
        "data": {
            "id": "__start__",
            "label": "Start",
            "frequency": sum(start_activities.values()),
            "isStart": True,
            "isEnd": False,
            "isSpecial": True
        }
    })

    # Add End node (marked with special flag)
    nodes.append({
        "data": {
            "id": "__end__",
            "label": "End",
            "frequency": sum(end_activities.values()),
            "isStart": False,
            "isEnd": True,
            "isSpecial": True
        }
    })

    # Add edges from DFG (activity to activity)
    for (source, target), weight in dfg.items():
        edges.append({
            "data": {
                "source": source,
                "target": target,
                "weight": weight
            }
        })

    # Add edges from Start node to starting activities
    for act, weight in start_activities.items():
        edges.append({
            "data": {
                "source": "__start__",
                "target": act,
                "weight": weight
            }
        })

    # Add edges from ending activities to End node
    for act, weight in end_activities.items():
        edges.append({
            "data": {
                "source": act,
                "target": "__end__",
                "weight": weight
            }
        })

    return DiscoverResponse(nodes=nodes, edges=edges)


class VariantInfo(BaseModel):
    """Model for variant information."""
    variant: List[str]
    count: int
    percentage: float


class MetricsResponse(BaseModel):
    """Response model for process metrics."""
    total_cases: int
    total_events: int
    total_activities: int
    avg_case_duration: Optional[str]
    median_case_duration: Optional[str]
    min_case_duration: Optional[str]
    max_case_duration: Optional[str]
    top_variants: List[VariantInfo]


def format_duration(td: timedelta) -> str:
    """Format a timedelta to a human-readable string."""
    total_seconds = int(td.total_seconds())
    if total_seconds < 0:
        return "N/A"

    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if seconds > 0 or not parts:
        parts.append(f"{seconds}s")

    return " ".join(parts)


@app.get("/metrics/{session_id}", response_model=MetricsResponse)
async def get_metrics(session_id: str):
    """
    Get process mining metrics and KPIs for a session.

    Returns:
    - total_cases: Number of process instances
    - total_events: Total number of events
    - total_activities: Number of unique activities
    - avg_case_duration: Average time to complete a case
    - median_case_duration: Median time to complete a case
    - top_variants: Top 10 process variants with counts and percentages
    """
    if session_id not in event_log_store:
        raise HTTPException(status_code=404, detail="Session not found")

    event_log = event_log_store[session_id]['event_log']

    # Basic counts
    total_cases = len(event_log)
    total_events = sum(len(trace) for trace in event_log)

    # Get unique activities
    activities = set()
    for trace in event_log:
        for event in trace:
            activities.add(event['concept:name'])
    total_activities = len(activities)

    # Calculate case durations
    case_durations: List[timedelta] = []
    for trace in event_log:
        if len(trace) >= 2:
            start_time = trace[0]['time:timestamp']
            end_time = trace[-1]['time:timestamp']
            duration = end_time - start_time
            case_durations.append(duration)

    # Duration statistics
    avg_case_duration = None
    median_case_duration = None
    min_case_duration = None
    max_case_duration = None

    if case_durations:
        # Sort for median calculation
        sorted_durations = sorted(case_durations)
        n = len(sorted_durations)

        # Average
        avg_td = sum(case_durations, timedelta()) / n
        avg_case_duration = format_duration(avg_td)

        # Median
        if n % 2 == 0:
            median_td = (sorted_durations[n // 2 - 1] + sorted_durations[n // 2]) / 2
        else:
            median_td = sorted_durations[n // 2]
        median_case_duration = format_duration(median_td)

        # Min/Max
        min_case_duration = format_duration(sorted_durations[0])
        max_case_duration = format_duration(sorted_durations[-1])

    # Get variants using pm4py
    variants = pm4py.get_variants(event_log)

    # Process variants - variants is a dict with tuple keys
    variant_list = []
    for variant_tuple, traces in variants.items():
        count = len(traces)
        percentage = (count / total_cases) * 100 if total_cases > 0 else 0
        # Convert tuple to list of activity names
        variant_activities = list(variant_tuple)
        variant_list.append({
            "variant": variant_activities,
            "count": count,
            "percentage": round(percentage, 2)
        })

    # Sort by count descending and take top 10
    variant_list.sort(key=lambda x: x["count"], reverse=True)
    top_variants = [VariantInfo(**v) for v in variant_list[:10]]

    return MetricsResponse(
        total_cases=total_cases,
        total_events=total_events,
        total_activities=total_activities,
        avg_case_duration=avg_case_duration,
        median_case_duration=median_case_duration,
        min_case_duration=min_case_duration,
        max_case_duration=max_case_duration,
        top_variants=top_variants
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
