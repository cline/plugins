import os
import pytest


def test_path_a_retriever():
    if not os.environ.get("YDC_API_KEY"):
        pytest.skip("YDC_API_KEY is required for this live integration test")

    from path_a_retriever import main

    docs = main("What are the three branches of the US government?")
    assert len(docs) > 0
    text = "\n".join(doc.page_content for doc in docs).lower()
    assert "legislative" in text or "congress" in text
    assert "executive" in text or "president" in text
    assert "judicial" in text or "court" in text
    for doc in docs:
        assert doc.metadata.get("url")


def test_path_b_agent():
    if not os.environ.get("YDC_API_KEY") or not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("YDC_API_KEY and OPENAI_API_KEY are required for this live integration test")

    from path_b_agent import main

    text = main("What are the three branches of the US government?").lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
