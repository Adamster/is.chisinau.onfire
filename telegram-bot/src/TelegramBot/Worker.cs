using Microsoft.Extensions.Options;

namespace TelegramBot;

public sealed class Worker(
    IOptions<TelegramBotOptions> telegramOptions,
    IOptions<RssOptions> rssOptions,
    IOptions<SupabaseOptions> supabaseOptions,
    IOptions<PollingOptions> pollingOptions,
    ILogger<Worker> logger) : BackgroundService
{
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

            await Task.Delay(
                TimeSpan.FromSeconds(pollingOptions.Value.IntervalSeconds),
                stoppingToken);
        }
    }
}
