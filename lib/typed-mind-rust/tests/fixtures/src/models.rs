#[derive(Debug, Clone)]
pub struct User {
    pub name: String,
    pub email: String,
    pub id: UserId,
    pub role: UserRole,
}

pub enum UserRole {
    Admin,
    User,
    Guest,
}

pub type UserId = u64;

pub const MAX_USERS: usize = 1000;
