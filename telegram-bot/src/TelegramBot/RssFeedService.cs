using System.ServiceModel.Syndication;
using System.Text;
using System.Xml;
using Microsoft.Extensions.Options;

namespace TelegramBot;

public sealed class RssFeedService(
    HttpClient httpClient,
    IOptions<RssOptions> rssOptions,
    ILogger<RssFeedService> logger)
{
    public async Task<IReadOnlyList<RssFeedItem>> GetFilteredItemsAsync(
        CancellationToken cancellationToken)
    {
        var feedUrl = rssOptions.Value.FeedUrl;
        if (string.IsNullOrWhiteSpace(feedUrl))
        {
            logger.LogWarning("RSS feed URL is not configured.");
            return Array.Empty<RssFeedItem>();
        }

        using var response = await httpClient.GetAsync(feedUrl, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = XmlReader.Create(stream, new XmlReaderSettings
        {
            Async = true,
        });

        var feed = SyndicationFeed.Load(reader);
        if (feed is null)
        {
            return Array.Empty<RssFeedItem>();
        }

        var candidates = feed.Items
            .Select(item => new RssFeedItem(
                Title: item.Title?.Text ?? string.Empty,
                Summary: item.Summary?.Text ?? string.Empty,
                Link: item.Links.FirstOrDefault()?.Uri?.ToString() ?? string.Empty,
                PublishedAt: item.PublishDate == DateTimeOffset.MinValue
                    ? null
                    : item.PublishDate))
            .Where(item => IsRelevant(item, rssOptions.Value))
            .ToArray();

        return candidates;
    }

    private static bool IsRelevant(RssFeedItem item, RssOptions options)
    {
        var text = new StringBuilder()
            .Append(item.Title)
            .Append(' ')
            .Append(item.Summary)
            .ToString()
            .ToLowerInvariant();

        var matchesKeyword = options.Keywords.Length == 0 ||
                             options.Keywords.Any(keyword =>
                                 text.Contains(keyword, StringComparison.OrdinalIgnoreCase));

        var matchesCity = options.CityKeywords.Length == 0 ||
                          options.CityKeywords.Any(city =>
                              text.Contains(city, StringComparison.OrdinalIgnoreCase));

        return matchesKeyword && matchesCity;
    }
}
