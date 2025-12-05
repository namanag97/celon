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


class PreviewResponse(BaseModel):
    """Response model for file preview (before column mapping)."""
    columns: list[str]
    preview_rows: list[dict]
    row_count: int
    temp_id: str


# Temporary storage for files awaiting column mapping
temp_file_store: Dict[str, bytes] = {}


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Process Mining API is running"}


@app.post("/preview", response_model=PreviewResponse)
async def preview_file(file: UploadFile = File(...)):
    """
    Preview an uploaded file and return columns for mapping.
    
    Step 1 of the upload flow:
    1. Upload file
    2. Get column names and preview rows
    3. User maps columns in UI
    4. Call /upload with mapping
    """
    filename = file.filename.lower() if file.filename else ""
    
    if not (filename.endswith('.csv') or filename.endswith('.xes')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only CSV and XES files are supported."
        )
    
    try:
        content = await file.read()
        
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
            columns = df.columns.tolist()
            # Get first 5 rows as preview
            preview_rows = df.head(5).to_dict(orient='records')
            row_count = len(df)
        else:  # XES
            # For XES, we don't need column mapping
            raise HTTPException(
                status_code=400,
                detail="XES files are pre-formatted. Please use /upload directly."
            )
        
        # Store file temporarily
        temp_id = str(uuid.uuid4())
        temp_file_store[temp_id] = content
        
        return PreviewResponse(
            columns=columns,
            preview_rows=preview_rows,
            row_count=row_count,
            temp_id=temp_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


class ColumnMapping(BaseModel):
    """Column mapping for process mining."""
    case_id_column: str
    activity_column: str
    timestamp_column: str


@app.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: Optional[UploadFile] = File(None),
    temp_id: Optional[str] = None,
    case_id_column: str = "case_id",
    activity_column: str = "activity",
    timestamp_column: str = "timestamp"
):
    """
    Upload an event log file for process mining analysis.
    
    Two ways to use:
    1. Direct upload with standard columns (case_id, activity, timestamp)
    2. After /preview: pass temp_id + column mapping
    
    Query parameters:
    - temp_id: ID from /preview response (use stored file)
    - case_id_column: Column name for case identifier
    - activity_column: Column name for activity/event
    - timestamp_column: Column name for timestamp
    """
    # Get file content
    if temp_id and temp_id in temp_file_store:
        content = temp_file_store.pop(temp_id)  # Remove from temp storage
        filename = "uploaded.csv"
    elif file:
        filename = file.filename.lower() if file.filename else ""
        if not (filename.endswith('.csv') or filename.endswith('.xes')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file format. Only CSV and XES files are supported."
            )
        content = await file.read()
    else:
        raise HTTPException(
            status_code=400,
            detail="Either file or temp_id must be provided"
        )
    
    try:
        if filename.endswith('.csv') or temp_id:
            # Parse CSV file
            df = pd.read_csv(io.BytesIO(content))
            
            # Validate mapped columns exist
            missing = []
            if case_id_column not in df.columns:
                missing.append(f"case_id_column '{case_id_column}'")
            if activity_column not in df.columns:
                missing.append(f"activity_column '{activity_column}'")
            if timestamp_column not in df.columns:
                missing.append(f"timestamp_column '{timestamp_column}'")
            
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mapped columns not found in file: {', '.join(missing)}. "
                           f"Available columns: {', '.join(df.columns.tolist())}"
                )
            
            # Rename columns to standard names for pm4py
            df = df.rename(columns={
                case_id_column: 'case_id',
                activity_column: 'activity',
                timestamp_column: 'timestamp'
            })
            
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
            event_log = pm4py.read_xes(io.BytesIO(content))
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store event log in memory
        event_log_store[session_id] = {
            'event_log': event_log,
            'filename': filename
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


class FilterRequest(BaseModel):
    """Request model for filtering event logs."""
    date_start: Optional[str] = None  # ISO format YYYY-MM-DD
    date_end: Optional[str] = None
    activities: Optional[List[str]] = None  # Include only these activities
    exclude_activities: Optional[List[str]] = None  # Exclude these activities


class PerformanceEdge(BaseModel):
    """Edge data with performance/duration information."""
    source: str
    target: str
    weight: int
    avg_duration_seconds: float
    avg_duration_formatted: str
    total_duration_seconds: float


class BottleneckInfo(BaseModel):
    """Information about a process bottleneck."""
    source: str
    target: str
    avg_duration: str
    total_duration: str
    count: int
    impact_score: float  # count × avg_duration in hours


class FilteredDiscoverResponse(BaseModel):
    """Response model for filtered process discovery with performance data."""
    nodes: list[dict]
    edges: list[dict]
    performance_edges: list[dict]  # Edges with duration data


class BottlenecksResponse(BaseModel):
    """Response model for bottleneck analysis."""
    bottlenecks: List[BottleneckInfo]


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


def calculate_transition_times(event_log) -> Dict[tuple, List[float]]:
    """Calculate transition times between activities in seconds."""
    transition_times: Dict[tuple, List[float]] = {}
    
    for trace in event_log:
        events = list(trace)
        for i in range(len(events) - 1):
            source = events[i]['concept:name']
            target = events[i + 1]['concept:name']
            source_time = events[i]['time:timestamp']
            target_time = events[i + 1]['time:timestamp']
            
            duration = (target_time - source_time).total_seconds()
            
            key = (source, target)
            if key not in transition_times:
                transition_times[key] = []
            transition_times[key].append(duration)
    
    return transition_times


def apply_filters_to_log(event_log, filters: FilterRequest):
    """Apply filters to event log and return filtered log."""
    from datetime import datetime
    from pm4py.objects.log.obj import EventLog, Trace
    
    filtered_traces = []
    
    for trace in event_log:
        # Filter by date range (check first event's timestamp)
        if filters.date_start or filters.date_end:
            if len(trace) == 0:
                continue
            first_event_time = trace[0]['time:timestamp']
            
            # Handle timezone-aware datetimes
            if hasattr(first_event_time, 'tzinfo') and first_event_time.tzinfo is not None:
                from datetime import timezone
                if filters.date_start:
                    start_date = datetime.fromisoformat(filters.date_start).replace(tzinfo=timezone.utc)
                    if first_event_time < start_date:
                        continue
                if filters.date_end:
                    end_date = datetime.fromisoformat(filters.date_end + "T23:59:59").replace(tzinfo=timezone.utc)
                    if first_event_time > end_date:
                        continue
            else:
                if filters.date_start:
                    start_date = datetime.fromisoformat(filters.date_start)
                    if first_event_time < start_date:
                        continue
                if filters.date_end:
                    end_date = datetime.fromisoformat(filters.date_end + "T23:59:59")
                    if first_event_time > end_date:
                        continue
        
        # Filter activities within trace
        if filters.activities or filters.exclude_activities:
            new_trace = Trace()
            for attr in trace.attributes:
                new_trace.attributes[attr] = trace.attributes[attr]
            
            for event in trace:
                activity = event['concept:name']
                
                # Check if activity should be included
                if filters.activities and activity not in filters.activities:
                    continue
                if filters.exclude_activities and activity in filters.exclude_activities:
                    continue
                
                new_trace.append(event)
            
            # Only include trace if it has events after filtering
            if len(new_trace) > 0:
                filtered_traces.append(new_trace)
        else:
            filtered_traces.append(trace)
    
    # Create new EventLog with filtered traces
    filtered_log = EventLog(filtered_traces)
    return filtered_log


@app.post("/filter/{session_id}", response_model=FilteredDiscoverResponse)
async def filter_and_discover(session_id: str, filters: FilterRequest):
    """
    Apply filters to event log and return filtered process discovery with performance data.
    
    Filters:
    - date_start/date_end: Filter cases by date range (ISO format YYYY-MM-DD)
    - activities: Include only these activities
    - exclude_activities: Exclude these activities
    """
    if session_id not in event_log_store:
        raise HTTPException(status_code=404, detail="Session not found")
    
    original_log = event_log_store[session_id]['event_log']
    
    # Apply filters
    filtered_log = apply_filters_to_log(original_log, filters)
    
    if len(filtered_log) == 0:
        return FilteredDiscoverResponse(nodes=[], edges=[], performance_edges=[])
    
    # Discover DFG on filtered log
    dfg, start_activities, end_activities = pm4py.discover_dfg(filtered_log)
    
    # Calculate activity frequencies
    activity_frequencies: Dict[str, int] = {}
    for trace in filtered_log:
        for event in trace:
            act_name = event['concept:name']
            activity_frequencies[act_name] = activity_frequencies.get(act_name, 0) + 1
    
    # Collect all activities
    activities = set()
    for (source, target) in dfg:
        activities.add(source)
        activities.add(target)
    activities.update(start_activities.keys())
    activities.update(end_activities.keys())
    
    # Build nodes
    nodes = []
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
    
    # Add special start/end nodes
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
    
    # Calculate transition times for performance data
    transition_times = calculate_transition_times(filtered_log)
    
    # Build edges with performance data
    edges = []
    performance_edges = []
    
    for (source, target), weight in dfg.items():
        edges.append({
            "data": {
                "source": source,
                "target": target,
                "weight": weight
            }
        })
        
        # Add performance edge data
        times = transition_times.get((source, target), [])
        if times:
            avg_seconds = sum(times) / len(times)
            total_seconds = sum(times)
            performance_edges.append({
                "data": {
                    "source": source,
                    "target": target,
                    "weight": weight,
                    "avgDurationSeconds": avg_seconds,
                    "avgDurationFormatted": format_duration(timedelta(seconds=avg_seconds)),
                    "totalDurationSeconds": total_seconds
                }
            })
    
    # Add start/end edges
    for act, weight in start_activities.items():
        edges.append({"data": {"source": "__start__", "target": act, "weight": weight}})
    for act, weight in end_activities.items():
        edges.append({"data": {"source": act, "target": "__end__", "weight": weight}})
    
    return FilteredDiscoverResponse(nodes=nodes, edges=edges, performance_edges=performance_edges)


@app.get("/bottlenecks/{session_id}", response_model=BottlenecksResponse)
async def get_bottlenecks(session_id: str):
    """
    Get bottleneck analysis for the process.
    
    Returns transitions ranked by impact score (count × avg_duration).
    """
    if session_id not in event_log_store:
        raise HTTPException(status_code=404, detail="Session not found")
    
    event_log = event_log_store[session_id]['event_log']
    
    # Calculate transition times
    transition_times = calculate_transition_times(event_log)
    
    # Build bottleneck list
    bottlenecks = []
    for (source, target), times in transition_times.items():
        if not times:
            continue
        
        count = len(times)
        avg_seconds = sum(times) / count
        total_seconds = sum(times)
        
        # Impact score: count × avg duration in hours
        impact_score = count * (avg_seconds / 3600)
        
        bottlenecks.append(BottleneckInfo(
            source=source,
            target=target,
            avg_duration=format_duration(timedelta(seconds=avg_seconds)),
            total_duration=format_duration(timedelta(seconds=total_seconds)),
            count=count,
            impact_score=round(impact_score, 2)
        ))
    
    # Sort by impact score descending
    bottlenecks.sort(key=lambda x: x.impact_score, reverse=True)
    
    return BottlenecksResponse(bottlenecks=bottlenecks[:10])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
