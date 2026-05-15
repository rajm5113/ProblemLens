from models.validation_result import ValidationResult


def test_validation_result_defaults() -> None:
    result = ValidationResult(valid=True, stage="models")

    assert result.valid is True
    assert result.errors == []
    assert result.warnings == []
    assert result.timestamp is not None
