import unittest
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException

from tests.test_support import apply_test_env, reload_modules, restore_env


class _FakeQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result


class _FakeDB:
    def __init__(self, result):
        self.result = result

    def query(self, *args, **kwargs):
        return _FakeQuery(self.result)


class PaymentPermissionTests(unittest.TestCase):
    def setUp(self):
        self.env_backup = apply_test_env()
        reload_modules("app.core.config")
        (self.payments_service,) = reload_modules("app.payments.service")

    def tearDown(self):
        restore_env(self.env_backup)

    def test_release_escrow_rejects_non_client_actor(self):
        milestone_id = uuid4()
        client_id = uuid4()
        intruder_id = uuid4()
        escrow = SimpleNamespace(
            milestone_id=milestone_id,
            status="held",
            client_id=client_id,
        )

        with self.assertRaises(HTTPException) as context:
            self.payments_service.release_escrow(
                _FakeDB(escrow),
                milestone_id=milestone_id,
                released_by=intruder_id,
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail, "Only the client can release escrow")

    def test_refund_escrow_rejects_non_client_actor(self):
        milestone_id = uuid4()
        client_id = uuid4()
        intruder_id = uuid4()
        escrow = SimpleNamespace(
            milestone_id=milestone_id,
            status="held",
            client_id=client_id,
        )

        with self.assertRaises(HTTPException) as context:
            self.payments_service.refund_escrow(
                _FakeDB(escrow),
                milestone_id=milestone_id,
                released_by=intruder_id,
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail, "Only the client can refund escrow")
