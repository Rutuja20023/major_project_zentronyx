import sys
import json
from pathlib import Path

# Ensure ai-service root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.models.gnn_model import BinaryGNNClassifier

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing input graph JSON argument or file"}))
        sys.exit(1)

    arg = sys.argv[1]
    input_path = Path(arg)
    
    if input_path.exists():
        with open(input_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)
    else:
        # Fallback if raw JSON string passed
        graph_data = json.loads(arg)

    classifier = BinaryGNNClassifier()
    result = classifier.predict(graph_data)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
