import unittest

from fastapi import HTTPException

from tests.test_support import apply_test_env, reload_modules, restore_env


class AuthSecurityTests(unittest.TestCase):
    def setUp(self):
        self.env_backup = apply_test_env(
            KEYCLOAK_VERIFY_AUDIENCE="true",
            KEYCLOAK_ALLOWED_AUDIENCES="backend,account",
            KEYCLOAK_ALLOWED_AZP="lancefy-web",
        )
        self.config_module, self.security_module = reload_modules(
            "app.core.config",
            "app.core.security",
        )

    def tearDown(self):
        restore_env(self.env_backup)

    def test_expected_audiences_uses_configured_values(self):
        self.assertEqual(
            self.security_module._expected_audiences(),
            ("backend", "account"),
        )

    def test_validate_audience_claim_rejects_invalid_audience(self):
        with self.assertRaises(HTTPException) as context:
            self.security_module._validate_audience_claim({"aud": ["other-service"]})

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Invalid token audience")

    def test_validate_authorized_party_rejects_invalid_azp(self):
        with self.assertRaises(HTTPException) as context:
            self.security_module._validate_authorized_party({"azp": "unknown-client"})

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Invalid token authorized party")
