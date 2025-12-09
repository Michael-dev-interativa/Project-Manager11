import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children, renderItem, item, idx }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    marginBottom: 8,
    zIndex: isDragging ? 100 : 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {renderItem(item, idx, listeners, attributes)}
    </div>
  );
}

// Exemplo de uso:
// export function PlanejamentosDiaContainer() {
//   const [planejamentos, setPlanejamentos] = useState([
//     { id: 1, tipo: 'documento', nome: 'ARQ-200' },
//     { id: 2, tipo: 'documento', nome: 'ARQ-500' },
//     // ...outras atividades/documentos
//   ]);
//
//   return (
//     <DragDropDiaAtividadesDndKit
//       atividades={planejamentos}
//       onReorder={setPlanejamentos}
//       renderItem={item => (
//         <div>
//           <b>{item.nome}</b> ({item.tipo})
//         </div>
//       )}
//     />
//   );
// }

export default function DragDropDiaAtividadesDndKit({ atividades, onReorder, renderItem }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Garante que cada item tem um id único (string)
  const getItemId = (item, idx) => {
    if (item && (item.id !== undefined && item.id !== null)) return String(item.id);
    if (item && (item._uniqueKey !== undefined && item._uniqueKey !== null)) return String(item._uniqueKey);
    return String(idx);
  };
  const itemIds = atividades.map(getItemId);
  // Debug: logar ids
  if (process.env.NODE_ENV !== 'production') {
    console.log('DnD itemIds:', itemIds, atividades);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = itemIds.findIndex(id => id === String(active.id));
      const newIndex = itemIds.findIndex(id => id === String(over.id));
      onReorder(arrayMove(atividades, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {atividades.map((item, idx) => (
          <SortableItem
            key={itemIds[idx]}
            id={itemIds[idx]}
            renderItem={renderItem}
            item={item}
            idx={idx}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
