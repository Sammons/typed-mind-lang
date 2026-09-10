use crate::models::{User, UserRole};

pub trait Repository {
    fn find_by_id(&self, id: u64) -> Option<User>;
    fn find_all(&self) -> Vec<User>;
}

pub struct UserService {
    role: UserRole,
}

impl UserService {
    pub fn new() -> Self {
        Self { role: UserRole::User }
    }

    pub fn find_by_id(&self, id: u64) -> Option<User> {
        None
    }
}

impl Repository for UserService {
    fn find_by_id(&self, id: u64) -> Option<User> { None }
    fn find_all(&self) -> Vec<User> { vec![] }
}
