import requests
import json

def test_discovery():
    # 1. Upload file
    url_upload = "http://localhost:8000/upload"
    files = {'file': open('test_log.csv', 'rb')}
    response_upload = requests.post(url_upload, files=files)
    
    if response_upload.status_code != 200:
        print("Upload failed:", response_upload.text)
        return

    data = response_upload.json()
    session_id = data['session_id']
    print(f"Uploaded successfully. Session ID: {session_id}")

    # 2. Discover process
    url_discover = f"http://localhost:8000/discover/{session_id}"
    response_discover = requests.get(url_discover)

    if response_discover.status_code != 200:
        print("Discovery failed:", response_discover.text)
        return

    graph_data = response_discover.json()
    print("\nDiscovery Result:")
    print(json.dumps(graph_data, indent=2))

    # Basic validation
    nodes = graph_data.get('nodes', [])
    edges = graph_data.get('edges', [])
    
    print(f"\nNodes found: {len(nodes)}")
    print(f"Edges found: {len(edges)}")
    
    # Check for Start and End nodes
    has_start = any(n['data']['id'] == 'start_node' for n in nodes)
    has_end = any(n['data']['id'] == 'end_node' for n in nodes)
    
    if has_start and has_end:
        print("SUCCESS: Start and End nodes present.")
    else:
        print("FAILURE: Missing Start or End nodes.")

if __name__ == "__main__":
    test_discovery()
