import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function DragDropDiaAtividades({ atividades, onReorder, renderItem }) {
  function handleOnDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(atividades);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  }

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="atividades-dia">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {atividades.map((item, idx) => (
              <Draggable key={item.id || idx} draggableId={String(item.id || idx)} index={idx}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.7 : 1,
                      marginBottom: 8,
                    }}
                  >
                    {renderItem(item, idx)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
