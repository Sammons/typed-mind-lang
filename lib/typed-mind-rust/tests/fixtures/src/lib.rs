pub mod models;
pub mod services;

use models::User;
use services::UserService;

pub fn run() {
    let service = UserService::new();
    let user = service.find_by_id(1);
}
