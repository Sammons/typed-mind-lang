from dataclasses import dataclass
from enum import Enum
from typing import Optional, List


@dataclass
class User:
    name: str
    email: str
    id: int
    role: UserRole


class UserRole(Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


MAX_USERS: int = 1000
API_VERSION: str = "v2"
