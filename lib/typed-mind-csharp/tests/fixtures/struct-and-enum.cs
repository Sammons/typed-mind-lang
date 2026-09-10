using System;

namespace MyApp.Models
{
    public struct Point
    {
        public double X;
        public double Y;
        public Color Label;
    }

    public struct Vector3
    {
        public float X;
        public float Y;
        public float Z;

        public float Magnitude()
        {
            return (float)Math.Sqrt(X * X + Y * Y + Z * Z);
        }
    }

    public enum Color
    {
        Red,
        Green,
        Blue,
        Alpha
    }

    public abstract class Shape
    {
        public abstract double Area();
        public abstract double Perimeter();
    }

    public sealed class Circle : Shape
    {
        public double Radius { get; set; }

        public override double Area() => Math.PI * Radius * Radius;
        public override double Perimeter() => 2 * Math.PI * Radius;
    }
}
