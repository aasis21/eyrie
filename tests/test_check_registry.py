import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


HELPER = Path(__file__).resolve().parents[1] / "scripts" / "check_registry.py"


class RegistryCheckTests(unittest.TestCase):
    def run_registry_check(self, contents):
        with tempfile.TemporaryDirectory() as folder:
            registry = Path(folder) / "registry.json"
            registry.write_text(contents, encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(HELPER), str(registry)], capture_output=True, text=True
            )

    def test_rejects_duplicate_aliases(self):
        result = self.run_registry_check(
            '{"projects":{"web":{"path":"first"},"web":{"path":"second"}}}'
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("duplicate JSON key 'web'", result.stderr)

    @unittest.skipUnless(os.name == "nt", "Windows drive-relative paths")
    def test_rejects_drive_relative_paths(self):
        result = self.run_registry_check('{"projects":{"web":{"path":"C:somewhere"}}}')
        self.assertEqual(result.returncode, 1)
        self.assertIn("use an absolute or HQ-relative project path", result.stderr)
