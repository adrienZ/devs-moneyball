import { describe, expect, it } from "vitest";
import { mergeGithubStarsNames, parseUsernamesFromHtml } from "../server/api/getGithubStarsName.get";

describe("parseUsernamesFromHtml", () => {
  it("extracts usernames without deduping", () => {
    const html = `
      <h2>GitHub Stars</h2>
      <p class="star__username">alice</p>
      <p class="star__username">bob</p>
      <p class="star__username">alice</p>
      <h2>Alumni</h2>
      <h4 class="star__name">cory</h4>
      <p class="star__username"><span>bob</span></p>
    `;

    const result = parseUsernamesFromHtml(html);

    expect(result).toEqual(["alice", "bob", "alice", "cory", "bob"]);
  });

  it("returns empty list when no usernames are present", () => {
    const html = `
      <h2>GitHub Stars</h2>
    `;

    const result = parseUsernamesFromHtml(html);

    expect(result).toEqual([]);
  });
});

describe("mergeGithubStarsNames", () => {
  it("merges profiles and alumni names", () => {
    const profilesHtml = `
      <h2>GitHub Stars</h2>
      <p class="star__username">alice</p>
    `;
    const alumniHtml = `
      <h2>Alumni</h2>
      <h4 class="star__name">bob</h4>
    `;

    const result = mergeGithubStarsNames(profilesHtml, alumniHtml);

    expect(result).toEqual(["alice", "bob"]);
  });
});
