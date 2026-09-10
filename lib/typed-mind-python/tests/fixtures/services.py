from typing import Optional, List, Protocol
from .models import User, UserRole


class Repository(Protocol):
    def find_by_id(self, id: int) -> Optional[User]: ...
    def find_all(self) -> List[User]: ...


class UserService:
    def __init__(self, role: UserRole) -> None:
        self._role = role

    async def find_by_id(self, id: int) -> Optional[User]:
        return None

    def find_all(self) -> List[User]:
        return []

    @staticmethod
    def create_default() -> "UserService":
        return UserService(UserRole.USER)
