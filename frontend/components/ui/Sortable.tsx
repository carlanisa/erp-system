'use client'

import { ReactNode, useId } from 'react'
import {
  DndContext, DragEndEvent, PointerSensor, KeyboardSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

type IdLike = string | number

type SortableProps<T extends { id: IdLike }> = {
  items: T[]
  onChange: (next: T[]) => void
  children: (item: T) => ReactNode
  /** Restrict drag to vertical only (default true). */
  vertical?: boolean
  /** Wrap each item with the default grip handle (default true). Set false to use your own handle. */
  withHandle?: boolean
  className?: string
  itemClassName?: string
}

export function Sortable<T extends { id: IdLike }>({
  items, onChange, children, vertical = true, withHandle = true,
  className, itemClassName,
}: SortableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const id = useId()

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((it) => String(it.id) === String(active.id))
    const newIdx = items.findIndex((it) => String(it.id) === String(over.id))
    if (oldIdx < 0 || newIdx < 0) return
    onChange(arrayMove(items, oldIdx, newIdx))
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter}
      modifiers={vertical ? [restrictToVerticalAxis, restrictToParentElement] : [restrictToParentElement]}
      onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => String(i.id))} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={String(item.id)} id={String(item.id)} withHandle={withHandle} className={itemClassName}>
              {children(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function SortableItem({ id, withHandle = true, className, children }: {
  id: string; withHandle?: boolean; className?: string; children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {withHandle ? (
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-1 flex-none cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      ) : children}
    </div>
  )
}
