import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Task } from "@/lib/data";
import { TaskItem } from "./tasks";
import { cn } from "@/lib/utils";

/** Manual order first (sort_order), then the automatic order for untouched tasks. */
export function byManualOrder(auto: (a: Task, b: Task) => number) {
  return (a: Task, b: Task) => {
    if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
    if (a.sort_order != null) return -1;
    if (b.sort_order != null) return 1;
    return auto(a, b);
  };
}

export function SortableTaskList({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = tasks.findIndex((t) => t.id === active.id);
    const to = tasks.findIndex((t) => t.id === over.id);
    const next = arrayMove(tasks, from, to);
    const orders = new Map(next.map((t, i) => [t.id, i]));
    const key = ["tasks", user?.id];
    qc.setQueryData<Task[]>(key, (old) => old?.map((t) => (orders.has(t.id) ? { ...t, sort_order: orders.get(t.id)! } : t)));
    const results = await Promise.all(next.map((t, i) => supabase.from("tasks").update({ sort_order: i }).eq("id", t.id)));
    if (results.some((r) => r.error)) toast.error("Couldn't save the new order");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((t, i) => <Row key={t.id} task={t} rank={i + 1} onEdit={onEdit} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({ task, rank, onEdit }: { task: Task; rank: number; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-stretch gap-1.5", isDragging && "relative z-10 opacity-90 shadow-lg")}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder (priority ${rank})`}
        className="flex w-8 shrink-0 touch-none flex-col items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing cursor-grab"
      >
        <span className="text-[10px] font-semibold tabular">{rank}</span>
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1"><TaskItem task={task} onEdit={onEdit} /></div>
    </div>
  );
}
