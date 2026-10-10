import assert from "node:assert/strict";
import test from "node:test";

import {
  agentWebsitesSchema,
  buildWebsitePayload,
  crawledPagesSchema,
} from "./website-data.ts";

test("adding a website sends the profile ID, trimmed URL, and one pattern per nonempty line", () => {
  assert.deepEqual(
    buildWebsitePayload(42, " https://example.com ", " /private/* \r\n\n /admin/*\n "),
    {
      profile_id: 42,
      url: "https://example.com",
      exclude_patterns: ["/private/*", "/admin/*"],
    },
  );
});

test("optional excluded patterns are omitted when blank", () => {
  for (const patterns of ["", " \r\n \n"]) {
    assert.deepEqual(buildWebsitePayload(42, "https://example.com", patterns), {
      profile_id: 42,
      url: "https://example.com",
    });
  }
});

test("include patterns preserve full URLs and trim one pattern per nonempty line", () => {
  assert.deepEqual(
    buildWebsitePayload(
      42,
      "https://example.com",
      " /private/* ",
      " https://example.com/about \r\n\nhttps://example.com/contact\n **/help/** ",
    ),
    {
      profile_id: 42,
      url: "https://example.com",
      include_patterns: [
        "https://example.com/about",
        "https://example.com/contact",
        "**/help/**",
      ],
      exclude_patterns: ["/private/*"],
    },
  );
});

test("blank include patterns are omitted and can be used without exclusions", () => {
  for (const patterns of ["", " \r\n \n"]) {
    assert.deepEqual(buildWebsitePayload(42, "https://example.com", "", patterns), {
      profile_id: 42,
      url: "https://example.com",
    });
  }
  assert.deepEqual(
    buildWebsitePayload(42, "https://example.com", "", "https://example.com/about"),
    {
      profile_id: 42,
      url: "https://example.com",
      include_patterns: ["https://example.com/about"],
    },
  );
});

test("adding a website rejects blank, malformed, and non-HTTP URLs", () => {
  for (const url of ["", " ", "not-a-url", "ftp://example.com", "javascript:alert(1)"]) {
    assert.throws(() => buildWebsitePayload(42, url, ""), /URL/);
  }
  assert.equal(
    buildWebsitePayload(42, "http://example.com/path", "").url,
    "http://example.com/path",
  );
});

test("websites accept optional excluded patterns and empty lists", () => {
  const website = {
    id: 1,
    url: "https://example.com",
    added_at: "2026-10-10T00:00:00Z",
  };
  assert.deepEqual(agentWebsitesSchema.parse([]), []);
  assert.deepEqual(agentWebsitesSchema.parse([website]), [website]);
  const excluded = { ...website, exclude_patterns: ["/private/*"] };
  assert.deepEqual(agentWebsitesSchema.parse([excluded]), [excluded]);
});

test("website lists accept null exclusions without dropping any records", () => {
  const website = {
    id: 1,
    url: "https://example.com",
    added_at: "2026-10-10T00:00:00Z",
    exclude_patterns: ["/private/*"],
  };
  const websites = [website, { ...website, id: 2, exclude_patterns: null }];
  assert.deepEqual(agentWebsitesSchema.parse(websites), websites);
  assert.deepEqual(
    agentWebsitesSchema.parse([{ ...website, exclude_patterns: [] }])[0].exclude_patterns,
    [],
  );
  for (const exclude_patterns of ["invalid", [null], [123]]) {
    assert.equal(
      agentWebsitesSchema.safeParse([{ ...website, exclude_patterns }]).success,
      false,
    );
  }
});

test("missing or null website data renders as an empty list", () => {
  for (const data of [undefined, null, []]) {
    assert.deepEqual(agentWebsitesSchema.parse(data), []);
  }
  const envelope = { success: true, status_code: 200 };
  assert.deepEqual(agentWebsitesSchema.parse(envelope.data), []);
});

test("malformed website data is not silently treated as an empty list", () => {
  for (const data of [{}, "", [{ id: 1 }]]) {
    assert.equal(agentWebsitesSchema.safeParse(data).success, false);
  }
});

test("crawl responses preserve progress, cursors, titles, URLs, and statuses", () => {
  for (const cursor of [42, 0, -1]) {
    const response = {
      status: "CRAWLING",
      total: 60,
      finished: 30,
      cursor,
      records: [
        {
          url: "https://example.com/about",
          status: "FINISHED",
          metadata: { title: "About" },
        },
        {
          url: "https://example.com/contact",
          status: "PENDING",
          metadata: { title: "" },
        },
      ],
    };
    assert.deepEqual(crawledPagesSchema.parse(response), response);
  }
});

test("empty batches still preserve a positive continuation cursor", () => {
  const response = {
    status: "PENDING",
    total: 30,
    finished: 0,
    cursor: 7,
    records: [],
  };
  assert.deepEqual(crawledPagesSchema.parse(response), response);
});

test("crawl records preserve Markdown content for the page dialog", () => {
  for (const markdown of ["# About\n\nOur **business**.", "", null, undefined]) {
    const response = {
      status: "FINISHED",
      total: 1,
      finished: 1,
      cursor: 0,
      records: [
        {
          url: "https://example.com/about",
          status: "FINISHED",
          markdown,
          metadata: { title: "About" },
        },
      ],
    };
    assert.equal(crawledPagesSchema.parse(response).records[0].markdown, markdown);
  }
});

test("malformed crawl responses are rejected instead of clearing the list", () => {
  const response = {
    status: "FINISHED",
    total: 30,
    finished: 30,
    cursor: 0,
    records: [],
  };
  for (const invalid of [
    null,
    { ...response, cursor: "30" },
    { ...response, cursor: 1.5 },
    { ...response, records: null },
    { ...response, records: [{ url: "/", status: "FINISHED" }] },
    { ...response, total: -1 },
  ]) {
    assert.equal(crawledPagesSchema.safeParse(invalid).success, false);
  }
});
