using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyApp.Services
{
    public class UserService : IUserService
    {
        private readonly ILogger _logger;

        public UserService(ILogger logger)
        {
            _logger = logger;
        }

        public async Task<User> GetUserAsync(int id)
        {
            return await _repository.FindAsync(id);
        }

        public void DeleteUser(int id) { }
    }

    public interface IUserService
    {
        Task<User> GetUserAsync(int id);
        void DeleteUser(int id);
    }

    public record User(string Name, string Email);

    public enum UserRole
    {
        Admin,
        User,
        Guest
    }
}
