import { X } from "lucide-react";
import { useModal } from "@/context/modal-context";
import { cn } from "@/lib/utils";

const widthMap = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function ModalStack() {
  const { stack, popModal } = useModal();

  if (stack.length === 0) return null;

  return (
    <>
      {stack.map((layer, index) => {
        const isTop = index === stack.length - 1;
        const zIndex = 40 + index * 10;

        return (
          <div key={layer.id} className="fixed inset-0" style={{ zIndex }}>
            <button
              type="button"
              aria-label="Close modal backdrop"
              className={cn(
                "modal-backdrop absolute inset-0 bg-ink/40 backdrop-blur-[2px]",
                !isTop && "pointer-events-none",
              )}
              onClick={() => isTop && popModal(layer.id)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4 sm:items-center">
              <div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "modal-sheet pointer-events-auto flex max-h-[min(90vh,820px)] w-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-elevated shadow-2xl",
                  widthMap[layer.width ?? "lg"],
                )}
              >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{layer.title}</h2>
                    {layer.subtitle && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{layer.subtitle}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => popModal(layer.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{layer.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
