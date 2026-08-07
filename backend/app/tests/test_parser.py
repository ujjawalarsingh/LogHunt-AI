from app.parser.log_parser import LogParser

def test_json_parsing():
    parser = LogParser()
    res = parser.parse_line('{"ip": "1.2.3.4", "message": "hello"}')
    assert res is not None
    assert res["source_ip"] == "1.2.3.4"

def test_unsupported():
    parser = LogParser()
    res = parser.parse_line('random garbage that is not syslog or json or apache')
    assert res is None
