<script lang="ts">
	import type { ColDef } from '$lib/stores/admin';

	let {
		tableName,
		cols,
		rows,
		stickyCol = false,
		onCellChange,
		onAddRow,
		onDeleteRow
	}: {
		tableName: string;
		cols: ColDef[];
		rows: Record<string, unknown>[];
		stickyCol?: boolean;
		onCellChange: (rowIdx: number, key: string, value: string) => void;
		onAddRow: () => void;
		onDeleteRow: (idx: number) => void;
	} = $props();

	let colWidths = $state<Record<string, number>>({});
	let resizing = $state<{ key: string; startX: number; startW: number } | null>(null);

	function startResize(e: MouseEvent, key: string, thEl: HTMLElement) {
		e.preventDefault();
		const startW = thEl.offsetWidth;
		resizing = { key, startX: e.clientX, startW };

		const onMove = (ev: MouseEvent) => {
			if (!resizing) return;
			const diff = ev.clientX - resizing.startX;
			colWidths = { ...colWidths, [key]: Math.max(50, resizing.startW + diff) };
		};
		const onUp = () => {
			resizing = null;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	function colStyle(col: ColDef): string {
		if (colWidths[col.key]) return `width:${colWidths[col.key]}px;min-width:${colWidths[col.key]}px`;
		if (col.w === 'col-narrow') return 'width:70px;min-width:70px';
		if (col.w === 'col-mid') return 'width:110px;min-width:110px';
		if (col.w === 'col-wide') return 'min-width:200px';
		return '';
	}

	function handleInput(e: Event, rowIdx: number, key: string) {
		const target = e.target as HTMLInputElement;
		onCellChange(rowIdx, key, target.value);
	}
</script>

<div class="table-wrap">
	<div class="table-actions">
		<button class="btn btn-secondary" onclick={onAddRow}>+ Add row</button>
	</div>

	<div class="scroll-x">
		<table>
			<thead>
				<tr>
					{#each cols as col, ci}
						{@const isSticky = stickyCol && ci === 0}
						<th
							class:sticky-col={isSticky}
							style={colStyle(col)}
						>
							{col.label}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								class="col-resize"
								onmousedown={(e) => {
									const th = (e.target as HTMLElement).parentElement;
									if (th) startResize(e, col.key, th);
								}}
							></span>
						</th>
					{/each}
					<th style="width:40px"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, ri}
					<tr>
						{#each cols as col, ci}
							{@const isSticky = stickyCol && ci === 0}
							<td class:sticky-col={isSticky}>
								<input
									type={col.type === 'number' ? 'number' : 'text'}
									value={row[col.key] ?? ''}
									oninput={(e) => handleInput(e, ri, col.key)}
								/>
							</td>
						{/each}
						<td class="row-actions">
							<button class="btn-del" onclick={() => onDeleteRow(ri)} title="Delete row">&times;</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.table-wrap {
		padding: 20px 28px;
		flex: 1;
		overflow: auto;
	}
	.table-actions {
		margin-bottom: 12px;
	}
	.scroll-x {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: var(--card);
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	thead th {
		background: #f5f2ec;
		text-align: left;
		padding: 10px 12px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		font-weight: 600;
		white-space: nowrap;
		border-bottom: 2px solid var(--line);
		position: sticky;
		top: 0;
		z-index: 2;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	thead th.sticky-col {
		position: sticky;
		left: 0;
		z-index: 3;
		background: #f5f2ec;
	}
	tbody td {
		padding: 4px 6px;
		border-bottom: 1px solid var(--line-soft);
		vertical-align: top;
	}
	tbody td.sticky-col {
		position: sticky;
		left: 0;
		z-index: 1;
		background: var(--card);
	}
	tbody tr:hover td {
		background: #faf8f3;
	}
	tbody tr:hover td.sticky-col {
		background: #faf8f3;
	}
	tbody td input {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		transition: border-color 0.15s, background 0.15s;
		font-size: 13px;
	}
	tbody td input:focus {
		border-color: var(--gold);
		background: var(--card);
		outline: none;
	}
	.row-actions {
		white-space: nowrap;
	}
	.btn-del {
		color: #A13024;
		font-size: 18px;
		padding: 4px 8px;
		opacity: 0.5;
		transition: opacity 0.15s;
		background: none;
		border: none;
		cursor: pointer;
	}
	.btn-del:hover {
		opacity: 1;
	}
	.col-resize {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 5px;
		cursor: col-resize;
		user-select: none;
	}
	th {
		position: relative;
	}
	.btn {
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		border: none;
		cursor: pointer;
	}
	.btn-secondary {
		background: var(--line);
		color: var(--ink-soft);
	}
	.btn-secondary:hover {
		opacity: 0.85;
	}
</style>
