using System;
using System.Collections.Generic;

namespace MyApp.Collections
{
    [Serializable]
    public class Repository<T> : IRepository<T> where T : class
    {
        private readonly List<T> _items = new();

        public void Add(T item)
        {
            _items.Add(item);
        }

        public T? FindById(int id)
        {
            return default;
        }

        public IEnumerable<T> GetAll()
        {
            return _items;
        }
    }

    public interface IRepository<T>
    {
        void Add(T item);
        T? FindById(int id);
        IEnumerable<T> GetAll();
    }
}
