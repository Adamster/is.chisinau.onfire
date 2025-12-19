using Microsoft.Extensions.Options;

namespace TelegramBot;

public sealed class Worker(
    IOptions<TelegramBotOptions> telegramOptions,
    IOptions<RssOptions> rssOptions,
    IOptions<SupabaseOptions> supabaseOptions,
    IOptions<PollingOptions> pollingOptions,
    RssFeedService rssFeedService,
    ILogger<Worker> logger) : BackgroundService
{
    private readonly HashSet<string> _seenLinks = new(StringComparer.OrdinalIgnoreCase);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Telegram bot worker starting. RssFeed={FeedUrl}",
            rssOptions.Value.FeedUrl);

        while (!stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation(
                "Heartbeat. TelegramChat={ChatId}, SupabaseUrl={SupabaseUrl}",
                telegramOptions.Value.ChatId,
                supabaseOptions.Value.Url);

            var items = await rssFeedService.GetFilteredItemsAsync(stoppingToken);
            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Link) || !_seenLinks.Add(item.Link))
                {
                    continue;
                }

                logger.LogInformation(
                    "New candidate article: {Title} ({Link})",
                    item.Title,
                    item.Link);
            }

            await Task.Delay(
                TimeSpan.FromSeconds(pollingOptions.Value.IntervalSeconds),
                stoppingToken);
        }
    }
}
