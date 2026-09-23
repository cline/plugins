import asyncio
import os
import pytest


def test_path_a_hosted():
    if not os.environ.get("YDC_API_KEY") or not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("YDC_API_KEY and OPENAI_API_KEY are required for this live integration test")

    from path_a_hosted import main

    result = asyncio.run(main("Search the web for the three branches of the US government"))
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
