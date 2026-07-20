import * as LucideIcons from 'lucide-react';
import { Circle, ExternalLink, type LucideIcon, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import type { NodeSpec } from '@/client/types.gen';
import { useNodeSpecs } from '@/components/flow/renderer';
import { Button } from '@/components/ui/button';

import { FlowNode, NodeType } from './types';

type AddNodePanelProps = {
    isOpen: boolean;
    onClose: () => void;
    onNodeSelect: (nodeType: NodeType) => void;
    nodes: FlowNode[];
};

// Section ordering and labels. Drives both the category → section title
// mapping and the rendering order.
const SECTION_ORDER: Array<{ category: NodeSpec['category']; title: string }> = [
    { category: 'trigger', title: 'Triggers' },
    { category: 'call_node', title: 'Agent Nodes' },
    { category: 'global_node', title: 'Global Nodes' },
    { category: 'integration', title: 'Integrations' },
];

function resolveIcon(name: string): LucideIcon {
    const icons = LucideIcons as unknown as Record<string, LucideIcon>;
    return icons[name] ?? Circle;
}

function NodeSection({
    title,
    specs,
    onNodeSelect,
    nodeTypeCounts,
}: {
    title: string;
    specs: NodeSpec[];
    onNodeSelect: (nodeType: NodeType) => void;
    nodeTypeCounts: Map<string, number>;
}) {
    if (specs.length === 0) return null;
    return (
        <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                {title}
            </h3>
            <div className="space-y-2">
                {specs.map((spec) => {
                    const Icon = resolveIcon(spec.icon);
                    const maxInstances = spec.graph_constraints?.max_instances;
                    const disabled =
                        maxInstances !== undefined &&
                        maxInstances !== null &&
                        (nodeTypeCounts.get(spec.name) ?? 0) >= maxInstances;
                    return (
                        <Button
                            key={spec.name}
                            variant="outline"
                            className="w-full justify-start px-3 py-2.5 h-auto hover:bg-foreground/[0.02] border border-border/40 hover:border-border/80 transition-all rounded-lg"
                            onClick={() => onNodeSelect(spec.name as NodeType)}
                            disabled={disabled}
                            title={
                                disabled
                                    ? `${spec.display_name} limit reached for this workflow`
                                    : undefined
                             }
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="bg-muted/40 p-1.5 rounded-lg border border-border/40 shrink-0">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                                    <span className="font-semibold text-xs text-foreground leading-none">
                                        {spec.display_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal mt-1 leading-normal truncate w-full">
                                        {spec.description}
                                    </span>
                                </div>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AddNodePanel({ isOpen, onNodeSelect, onClose, nodes }: AddNodePanelProps) {
    const { specs } = useNodeSpecs();

    // Group registered specs by category, preserving the SECTION_ORDER.
    // Adding a new node type with a new spec.category just shows up here.
    const sections = useMemo(() => {
        return SECTION_ORDER.map(({ category, title }) => ({
            title,
            specs: specs.filter((s) => s.category === category),
        }));
    }, [specs]);

    const nodeTypeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        nodes.forEach((node) => {
            counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
        });
        return counts;
    }, [nodes]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <div
            className={`fixed z-51 right-0 top-0 h-full w-80 bg-background border-l border-border transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="p-5 h-full overflow-y-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold tracking-tight">Nodes</h2>
                        <a
                            href="https://docs.dograh.com/voice-agent/introduction"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            View Documentation
                        </a>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="space-y-6">
                    {sections.map(({ title, specs }) => (
                        <NodeSection
                            key={title}
                            title={title}
                            specs={specs}
                            onNodeSelect={onNodeSelect}
                            nodeTypeCounts={nodeTypeCounts}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
