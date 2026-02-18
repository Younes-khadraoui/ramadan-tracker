import { useState, useCallback, useRef, useEffect } from "react";
import { Task, CellState } from "@/lib/types";
import {
  loadData,
  saveData,
  generateId,
  cycleCell,
  RAMADAN_DAYS,
} from "@/lib/storage";
import {
  GripVertical,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
} from "lucide-react";

export default function RamadanTracker() {
  const [data, setData] = useState(() => loadData());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);
  const [animatingBurst, setAnimatingBurst] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const rootTasks = data.tasks
    .filter((t) => t.parentId === null)
    .sort((a, b) => a.order - b.order);

  const getChildren = (parentId: string) =>
    data.tasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.order - b.order);

  const toggleCell = useCallback((taskId: string, day: number) => {
    const cellKey = `${taskId}-${day}`;
    setAnimatingCell(cellKey);

    setData((prev) => {
      const tasks = prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const current = t.cells[day] || "none";
        const next = cycleCell(current);
        return { ...t, cells: { ...t.cells, [day]: next } };
      });
      return { ...prev, tasks };
    });

    // Determine burst type after state update
    setData((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const state = task?.cells[day] || "none";
      if (state !== "none") {
        setAnimatingBurst(cellKey + "-" + state);
        setTimeout(() => setAnimatingBurst(null), 500);
      }
      return prev;
    });

    setTimeout(() => setAnimatingCell(null), 350);
  }, []);

  const addTask = (parentId: string | null) => {
    const siblings = data.tasks.filter((t) => t.parentId === parentId);
    const newTask: Task = {
      id: generateId(),
      name: "",
      parentId,
      order: siblings.length,
      cells: {},
    };
    setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setEditingId(newTask.id);
    if (parentId) setCollapsed((prev) => ({ ...prev, [parentId]: false }));
  };

  const updateTaskName = (id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, name } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id && t.parentId !== id),
    }));
  };

  const finishEditing = () => setEditingId(null);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Drag and drop for reordering
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    setData((prev) => {
      const dragTask = prev.tasks.find((t) => t.id === dragId);
      const targetTask = prev.tasks.find((t) => t.id === targetId);
      if (!dragTask || !targetTask) return prev;
      if (dragTask.parentId !== targetTask.parentId) return prev;

      const siblings = prev.tasks
        .filter((t) => t.parentId === dragTask.parentId)
        .sort((a, b) => a.order - b.order);

      const filtered = siblings.filter((t) => t.id !== dragId);
      const targetIdx = filtered.findIndex((t) => t.id === targetId);
      filtered.splice(targetIdx, 0, dragTask);

      const orderMap: Record<string, number> = {};
      filtered.forEach((t, i) => (orderMap[t.id] = i));

      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t,
        ),
      };
    });
    setDragId(null);
    setDragOverId(null);
  };

  const getCellBg = (state: CellState): string => {
    if (state === "done") return "bg-cell-done";
    if (state === "missed") return "bg-cell-missed";
    return "hover:bg-muted/30";
  };

  const days = Array.from({ length: RAMADAN_DAYS }, (_, i) => i + 1);

  const renderTaskRow = (task: Task, depth: number = 0) => {
    const children = getChildren(task.id);
    const isCollapsed = collapsed[task.id];
    const isParent = children.length > 0;
    const cellKey = (day: number) => `${task.id}-${day}`;

    return (
      <div key={task.id}>
        <div
          className={`flex items-stretch border-b border-border transition-colors min-w-max ${
            dragOverId === task.id ? "bg-primary/10" : ""
          } ${dragId === task.id ? "dragging" : ""}`}
          draggable
          onDragStart={() => handleDragStart(task.id)}
          onDragOver={(e) => handleDragOver(e, task.id)}
          onDrop={() => handleDrop(task.id)}
          onDragEnd={() => {
            setDragId(null);
            setDragOverId(null);
          }}
        >
          {/* Task name cell - sticky */}
          <div
            className="sticky left-0 z-10 flex items-center gap-1 bg-card border-r border-border min-w-[220px] max-w-[220px] px-2 py-3"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <div className="drag-handle flex-shrink-0">
              <GripVertical size={14} className="text-muted-foreground" />
            </div>

            {isParent ? (
              <button
                onClick={() => toggleCollapse(task.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            ) : (
              <span className="w-[14px] flex-shrink-0" />
            )}

            {editingId === task.id ? (
              <input
                ref={editRef}
                dir="auto"
                value={task.name}
                onChange={(e) => updateTaskName(task.id, e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") finishEditing();
                }}
                className="flex-1 bg-transparent border-b border-primary/50 outline-none text-sm font-arabic text-foreground min-w-0"
                placeholder="اسم المهمة..."
              />
            ) : (
              <span
                onClick={() => setEditingId(task.id)}
                className="flex-1 text-sm cursor-text truncate font-arabic text-foreground/90 hover:text-foreground transition-colors"
                dir="auto"
              >
                {task.name || (
                  <span className="text-muted-foreground italic">
                    اضغط للتسمية
                  </span>
                )}
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              className="flex-shrink-0 text-muted-foreground/20 hover:text-destructive transition-colors"
            >
              <Trash2 size={11} />
            </button>

            <button
              onClick={() => addTask(task.id)}
              className="flex-shrink-0 text-muted-foreground/30 hover:text-primary transition-colors"
              title="Add subtask"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Day cells */}
          {days.map((day) => {
            const state = task.cells[day] || "none";
            const key = cellKey(day);
            const isAnimating = animatingCell === key;
            const burst = animatingBurst?.startsWith(key);
            const burstType = burst
              ? animatingBurst?.endsWith("done")
                ? "done"
                : "missed"
              : null;

            return (
              <div
                key={day}
                onClick={() => toggleCell(task.id, day)}
                className={`
                  min-w-[36px] w-[36px] flex-shrink-0 border-r border-border cursor-pointer
                  transition-colors duration-150 select-none
                  hover:brightness-125
                  ${getCellBg(state)}
                  ${isAnimating ? "cell-pop" : ""}
                  ${burst ? `cell-burst cell-burst-${burstType}` : ""}
                `}
              />
            );
          })}
        </div>

        {/* Children */}
        {isParent &&
          !isCollapsed &&
          children.map((child) => renderTaskRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary font-arabic">
          متتبع رمضان ١٤٤٦
        </h1>
        <button
          onClick={() => addTask(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
        >
          <Plus size={16} />
          <span>إضافة مهمة</span>
        </button>
      </div>

      {/* Table */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-border bg-card"
      >
        <div className="w-max min-w-full">
          {/* Header row */}
          <div className="flex border-b border-border bg-secondary/50 sticky top-0 z-20 min-w-max">
            <div className="sticky left-0 z-30 bg-secondary min-w-[220px] max-w-[220px] px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border">
              المهمة
            </div>
            {days.map((day) => (
              <div
                key={day}
                className="min-w-[36px] w-[36px] flex-shrink-0 text-center py-2 text-xs font-medium text-muted-foreground border-r border-border"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Task rows */}
          {rootTasks.map((task) => renderTaskRow(task))}
        </div>
      </div>
    </div>
  );
}
