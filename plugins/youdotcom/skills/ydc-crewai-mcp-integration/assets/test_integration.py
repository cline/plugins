import os
import pytest


def test_path_a_basic_dsl():
    if not os.environ.get("YDC_API_KEY"):
        pytest.skip("YDC_API_KEY is required for this live integration test")

    from path_a_basic_dsl import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text


def test_path_b_tool_filter():
    if not os.environ.get("YDC_API_KEY"):
        pytest.skip("YDC_API_KEY is required for this live integration test")

    from path_b_tool_filter import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
