namespace TelegramBot;

public sealed record RssFeedItem(
    string Title,
    string Summary,
    string Link,
    DateTimeOffset? PublishedAt);
