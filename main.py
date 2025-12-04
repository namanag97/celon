"""
Process Mining Application - FastAPI Backend
"""

import uuid
import io
from typing import Dict, Any

import pandas as pd
import pm4py
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


@app.get("/discover")
async def discover_process():
    """
    Discover process model from uploaded event log.
    
    Returns the discovered process model using pm4py algorithms.
    """
    # TODO: Implement process discovery logic
    return {"status": "pending", "message": "Process discovery not yet implemented"}


@app.get("/metrics")
async def get_metrics():
    """
    Get process mining metrics and KPIs.
    
    Returns metrics such as case duration, throughput, bottlenecks, etc.
    """
    # TODO: Implement metrics calculation logic
    return {"status": "pending", "message": "Metrics calculation not yet implemented"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
