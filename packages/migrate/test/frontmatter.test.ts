import { test, expect, describe } from "bun:test";
import { parseFrontmatter } from "../src/frontmatter";

describe("parseFrontmatter", () => {
  test("splits a leading --- fence and parses YAML", () => {
    const input = "---\ndescription: My rule\nalwaysApply: true\n---\nBody line one.\nBody line two.\n";
    const { data, body } = parseFrontmatter(input);
    expect(data.description).toBe("My rule");
    expect(data.alwaysApply).toBe(true);
    expect(body).toBe("Body line one.\nBody line two.\n");
  });

  test("returns empty data when there is no frontmatter", () => {
    const input = "Just a body, no fence.\n";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(body).toBe("Just a body, no fence.\n");
  });

  test("does not treat a horizontal rule mid-document as frontmatter", () => {
    const input = "Intro paragraph.\n\n---\n\nMore text.\n";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(body).toBe(input);
  });

  test("tolerates a leading BOM and CRLF newlines", () => {
    const input = "﻿---\r\ndescription: X\r\n---\r\nBody.\r\n";
    const { data, body } = parseFrontmatter(input);
    expect(data.description).toBe("X");
    expect(body).toBe("Body.\r\n");
  });
});
