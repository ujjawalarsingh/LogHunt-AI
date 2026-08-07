from app.detection.engine import DetectionEngine

def test_detect_empty():
    engine = DetectionEngine()
    assert engine.detect([{"some": "log"}]) == []
