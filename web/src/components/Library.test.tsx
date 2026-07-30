// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { groupBySubCategory, countByCategory, countByActivity } from "./Library";
import type { Template } from "../lib/types";

function tpl(overrides: Partial<Template>): Template {
  return {
    id: "t",
    name: "name",
    desc: "desc",
    category: "server",
    subCategory: "監視",
    format: "toml",
    output: "markdown",
    updated: "2026-07-30",
    live: true,
    data: "",
    template: "",
    ...overrides,
  };
}

describe("groupBySubCategory", () => {
  it("keeps the same sub-category name separate across different domains", () => {
    // Regression: #572 found sections were once keyed by subCategory text
    // alone, so "監視" under server and network collapsed into one section.
    const list = [
      tpl({ id: "s1", category: "server", subCategory: "監視" }),
      tpl({ id: "n1", category: "network", subCategory: "監視" }),
    ];
    const groups = groupBySubCategory(list);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.key).sort()).toEqual(["network/監視", "server/監視"]);
  });

  it("orders groups by category order, then by first appearance within a category", () => {
    const list = [
      tpl({ id: "n1", category: "network", subCategory: "VLAN" }),
      tpl({ id: "s1", category: "server", subCategory: "SSH" }),
      tpl({ id: "s2", category: "server", subCategory: "sudo" }),
      tpl({ id: "n2", category: "network", subCategory: "DHCP" }),
    ];
    const groups = groupBySubCategory(list);
    // network sorts before server (CATS order), and within each category,
    // groups appear in first-seen order (VLAN before DHCP; SSH before sudo).
    expect(groups.map((g) => g.key)).toEqual(["network/VLAN", "network/DHCP", "server/SSH", "server/sudo"]);
  });

  it("preserves template order within a group and groups all matching items together", () => {
    const list = [
      tpl({ id: "a", category: "server", subCategory: "SSH" }),
      tpl({ id: "b", category: "server", subCategory: "sudo" }),
      tpl({ id: "c", category: "server", subCategory: "SSH" }),
    ];
    const groups = groupBySubCategory(list);
    const ssh = groups.find((g) => g.key === "server/SSH")!;
    expect(ssh.items.map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("countByCategory", () => {
  const list = [
    tpl({ id: "1", category: "server" }),
    tpl({ id: "2", category: "server" }),
    tpl({ id: "3", category: "network" }),
  ];

  it("returns the full list length for an always-true predicate", () => {
    expect(countByCategory(list, () => true)).toBe(3);
  });

  it("counts only templates matching the given predicate", () => {
    expect(countByCategory(list, (t) => t.category === "server")).toBe(2);
    expect(countByCategory(list, (t) => t.category === "network")).toBe(1);
    expect(countByCategory(list, (t) => t.category === "dns")).toBe(0);
  });

  it("supports predicates finer than raw category equality", () => {
    const debianOnly = [
      tpl({ id: "d1", category: "server", subCategory: "Debian系" }),
      tpl({ id: "d2", category: "server", subCategory: "RHEL系" }),
    ];
    expect(countByCategory(debianOnly, (t) => t.category === "server" && t.subCategory === "Debian系")).toBe(1);
  });
});

describe("countByActivity", () => {
  const list = [
    tpl({ id: "1", activity: "build" }),
    tpl({ id: "2" }), // no activity field -- must count as "build" (the documented default)
    tpl({ id: "3", activity: "troubleshoot" }),
  ];

  it("returns the full list length for 'all'", () => {
    expect(countByActivity(list, "all")).toBe(3);
  });

  it("treats a missing activity field as 'build'", () => {
    expect(countByActivity(list, "build")).toBe(2);
  });

  it("counts only templates matching the given activity", () => {
    expect(countByActivity(list, "troubleshoot")).toBe(1);
    expect(countByActivity(list, "drill")).toBe(0);
  });
});
