// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
// Side-effect import: registers the SchemaField renderer in the proxy so
// sub-fields rendered by RecordField produce real output in tests.
import "../SchemaField";
import { RecordField } from "./RecordField";

const filename = "test.json";
const path = "assets.settings.testRecord";
const schema = z.record(z.string(), z.number());

const renderField = () =>
  render(
    <ThemeProvider>
      <RecordField
        label="State"
        schema={schema}
        filename={filename}
        path={path}
      />
    </ThemeProvider>,
  );

beforeEach(() => {
  useSessionStore.setState({ sessions: {} });
  useSessionStore.getState().initSession(filename, createCartridge(filename));
  useSessionStore.getState().updateDraft(filename, (draft) => {
    setByPath(draft, path, { hp: 1 });
  });
});

afterEach(() => {
  cleanup();
  useSessionStore.setState({ sessions: {} });
});

describe("RecordField", () => {
  it("renders entries and adds a key", () => {
    renderField();

    expect(screen.getByText("hp")).toBeDefined();

    const input = screen.getByPlaceholderText("New key");
    fireEvent.change(input, { target: { value: "energy" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    const draft = useSessionStore.getState().sessions[filename]?.draft;
    expect(getByPath(draft, path)).toEqual({ hp: 1, energy: 0 });
  });

  it("renders empty record path without snapshot-loop warnings", () => {
    useSessionStore.getState().updateDraft(filename, (draft) => {
      setByPath(draft, path, undefined);
    });

    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    renderField();

    expect(screen.getByText("No entries yet.")).toBeDefined();
    expect(
      errorSpy.mock.calls.some(([arg]) =>
        String(arg).includes("getSnapshot should be cached"),
      ),
    ).toBe(false);

    errorSpy.mockRestore();
  });
});
