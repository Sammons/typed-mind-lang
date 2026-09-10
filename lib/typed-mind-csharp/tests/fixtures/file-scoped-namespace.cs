using System;
using Microsoft.Extensions.Logging;

namespace MyApp.Handlers;

public class OrderHandler
{
    private readonly ILogger<OrderHandler> _logger;

    public OrderHandler(ILogger<OrderHandler> logger)
    {
        _logger = logger;
    }

    public void HandleOrder(int orderId)
    {
        _logger.LogInformation("Processing order {OrderId}", orderId);
    }

    public static OrderHandler Create(ILogger<OrderHandler> logger)
    {
        return new OrderHandler(logger);
    }
}
