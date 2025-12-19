namespace TelegramBot;

public sealed class TelegramBotOptions
{
    public const string SectionName = "TelegramBot";
    public string Token { get; init; } = string.Empty;
    public string ChatId { get; init; } = string.Empty;
}

public sealed class RssOptions
{
    public const string SectionName = "Rss";
    public string FeedUrl { get; init; } = string.Empty;
    public string[] Keywords { get; init; } = [];
    public string[] CityKeywords { get; init; } = [];
}

public sealed class SupabaseOptions
{
    public const string SectionName = "Supabase";
    public string Url { get; init; } = string.Empty;
    public string ServiceRoleKey { get; init; } = string.Empty;
}

public sealed class PollingOptions
{
    public const string SectionName = "Polling";
    public int IntervalSeconds { get; init; } = 300;
}
