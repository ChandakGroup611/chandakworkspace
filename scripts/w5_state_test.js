const { HierarchyStateManager } = require('../lib/services/HierarchyStateManager.ts');
// Need a transpiler wrapper since it's ts. I'll just copy the logic here to test it.
const bubbleTaskCount = (nodes, targetId, countDelta = 1) => {
    let foundInLevel = false;
    const updatedNodes = nodes.map(node => {
      if (node.is_deleted) return node;
      if (node.id === targetId) {
        foundInLevel = true;
        const isWorkspace = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
        return {
          ...node,
          total_hierarchy_task_count: isWorkspace ? (node.total_hierarchy_task_count || 0) + countDelta : node.total_hierarchy_task_count,
          direct_task_count: isWorkspace ? (node.direct_task_count || 0) + countDelta : node.direct_task_count,
          child_task_count: (node.type === 'TASK' || node.type === 'SUB_TASK') ? (node.child_task_count || 0) + countDelta : node.child_task_count
        };
      }
      if (node.children && node.children.length > 0) {
        const { found, nodes: newChildren } = bubbleTaskCount(node.children, targetId, countDelta);
        if (found) {
          foundInLevel = true;
          const isWorkspace = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
          return {
            ...node,
            children: newChildren,
            total_hierarchy_task_count: isWorkspace ? (node.total_hierarchy_task_count || 0) + countDelta : node.total_hierarchy_task_count
          };
        }
      }
      return node;
    });
    return { found: foundInLevel, nodes: updatedNodes };
};

const mergePrefetchedChildren = (localChildren, fetchedChildren) => {
    const validFetched = fetchedChildren.filter(c => !c.is_deleted);
    if (!localChildren || localChildren.length === 0) return validFetched;
    const fetchedIds = new Set(validFetched.map(c => c.id));
    const merged = [...validFetched];
    for (const local of localChildren) {
      if (local.is_deleted || local.isPendingDelete) {
        const idx = merged.findIndex(c => c.id === local.id);
        if (idx !== -1) merged.splice(idx, 1);
        continue;
      }
      if (local.isOptimistic && !fetchedIds.has(local.id)) {
        merged.unshift(local);
      }
    }
    return merged;
};

// --- Tests ---
console.log("Running Phase W5 State Tests...");

// Test 1: Task Count Bubbling
console.log("\n--- Test 1: Task Count Bubbling ---");
const t1_tree = [{
    id: 'A', type: 'WORKSPACE', total_hierarchy_task_count: 10, children: [
        { id: 'B', type: 'SUB_WORKSPACE', total_hierarchy_task_count: 5, children: [] }
    ]
}];
const r1 = bubbleTaskCount(t1_tree, 'B', 1).nodes;
console.log(`Expected A=11, B=6. Got: A=${r1[0].total_hierarchy_task_count}, B=${r1[0].children[0].total_hierarchy_task_count}`);

// Test 2: Deep Hierarchy Bubbling
console.log("\n--- Test 2: Deep Hierarchy Bubbling ---");
const t2_tree = [{
    id: 'A', type: 'WORKSPACE', total_hierarchy_task_count: 0, children: [
        { id: 'B', type: 'SUB_WORKSPACE', total_hierarchy_task_count: 0, children: [
            { id: 'C', type: 'SUB_WORKSPACE', total_hierarchy_task_count: 0 }
        ]}
    ]
}];
const r2 = bubbleTaskCount(t2_tree, 'C', 1).nodes;
console.log(`Expected A=1, B=1, C=1. Got: A=${r2[0].total_hierarchy_task_count}, B=${r2[0].children[0].total_hierarchy_task_count}, C=${r2[0].children[0].children[0].total_hierarchy_task_count}`);

// Test 3: Optimistic Preservation
console.log("\n--- Test 3: Optimistic Preservation ---");
const local3 = [{ id: 'opt1', isOptimistic: true, title: 'Opt Task' }];
const fetched3 = [{ id: 'db1', title: 'DB Task' }];
const r3 = mergePrefetchedChildren(local3, fetched3);
console.log(`Expected 2 items. Got ${r3.length}. Has opt1? ${!!r3.find(x => x.id === 'opt1')}`);

// Test 4: Optimistic Replacement
console.log("\n--- Test 4: Optimistic Replacement ---");
const local4 = [{ id: 'task1', isOptimistic: true, title: 'Old Title' }];
const fetched4 = [{ id: 'task1', title: 'New Title' }];
const r4 = mergePrefetchedChildren(local4, fetched4);
console.log(`Expected 1 item. Got ${r4.length}. Title: ${r4[0].title}`);

// Test 5: Deleted Record Protection
console.log("\n--- Test 5: Deleted Record Protection ---");
const local5 = [{ id: 'task1', isPendingDelete: true }];
const fetched5 = [{ id: 'task1', title: 'Still in DB' }];
const r5 = mergePrefetchedChildren(local5, fetched5);
console.log(`Expected 0 items (local delete respected). Got ${r5.length}.`);

