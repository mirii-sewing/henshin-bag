document.addEventListener('DOMContentLoaded', () => {
    const inputs = [
        'finished_width', 'finished_height', 'gusset',
        'split_height'
    ];
    const radios = ['pattern_orientation', 'has_split'];

    // UI Elements
    const splitSettings = document.getElementById('split_settings');
    const resultsContainer = document.getElementById('calculation_results');
    const svg = document.getElementById('pattern_svg');

    // Initialization
    function init() {
        // Event Listeners
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', calculate);
        });

        document.getElementsByName('pattern_orientation').forEach(el => {
            el.addEventListener('change', calculate);
        });

        document.getElementsByName('has_split').forEach(el => {
            el.addEventListener('change', (e) => {
                if (e.target.value === 'yes') {
                    splitSettings.classList.remove('hidden');
                } else {
                    splitSettings.classList.add('hidden');
                }
                calculate();
            });
        });

        calculate();
    }

    function calculate() {
        const fw = parseFloat(document.getElementById('finished_width').value) || 0;
        const fh = parseFloat(document.getElementById('finished_height').value) || 0;
        const g = parseFloat(document.getElementById('gusset').value) || 0;
        const splitHeight = parseFloat(document.getElementById('split_height').value) || 0;

        const orientation = document.querySelector('input[name="pattern_orientation"]:checked').value;
        const hasSplit = document.querySelector('input[name="has_split"]:checked').value === 'yes';

        const SA = 1; // Seam Allowance 1cm

        // Flat sizes (including gusset based on hapimade logic)
        // b (finished width) + c (gusset) = Bag mouth width
        // a (finished height) + c/2 = Total flat height
        const flatW = fw + g;
        const flatH = fh + (g / 2);

        let results = [];

        // 1. 裏地の計算 (常に1枚断ちを基本とする)
        const liningW = flatW + (SA * 2);
        const liningH = (flatH * 2) + (SA * 2);
        results.push({
            label: '裏地 (1枚)',
            size: `${liningW} × ${liningH}`
        });

        // 2. 表地の計算
        if (!hasSplit) {
            // 切り替えなし
            if (orientation === 'none') {
                // 底で折る
                const bodyW = flatW + (SA * 2);
                const bodyH = (flatH * 2) + (SA * 2);
                results.push({ label: '表地 本体 (1枚)', size: `${bodyW} × ${bodyH}` });
            } else {
                // 底で縫う
                const bodyW = flatW + (SA * 2);
                const bodyH = flatH + (SA * 2); // Top and Bottom SA
                results.push({ label: '表地 本体 (2枚)', size: `${bodyW} × ${bodyH}` });
            }
        } else {
            // 切り替えあり
            // 切り替え布(Bottom part)の計算
            // 仕上がり高さ splitHeight 
            // 実際は底マチ分(g/2)も含む
            const subPartH = splitHeight + (g / 2);
            const mainPartH = fh - splitHeight;

            // 警告チェック
            if (mainPartH < 2) {
                // あまりに本体が短い場合
                results.push({ label: '⚠️ 注意', size: '切り替えが高すぎます！' });
            }

            const width = flatW + (SA * 2);

            if (orientation === 'none') {
                // 底で折る（切り替え布が1枚の長い布）
                const subW = width;
                const subH = (subPartH * 2) + (SA * 2); // 上下(本体との接続部)に縫い代
                results.push({ label: '表地 切り替え布 (1枚)', size: `${subW} × ${subH}` });

                const mainW = width;
                const mainH = mainPartH + (SA * 2); // 入れ口と接続部に縫い代
                results.push({ label: '表地 本体 (2枚)', size: `${mainW} × ${mainH}` });
            } else {
                // 底で縫う
                const subW = width;
                const subH = subPartH + (SA * 2); // 接続部と底縫い合わせに縫い代
                results.push({ label: '表地 切り替え布 (2枚)', size: `${subW} × ${subH}` });

                const mainW = width;
                const mainH = mainPartH + (SA * 2);
                results.push({ label: '表地 本体 (2枚)', size: `${mainW} × ${mainH}` });
            }
        }

        renderResults(results);
        drawDiagram(fw, fh, g, hasSplit, splitHeight, orientation);
    }

    function renderResults(results) {
        resultsContainer.innerHTML = results.map(res => `
            <div class="result-item">
                <h3>${res.label}</h3>
                <div class="result-size">${res.size}<span class="unit">cm</span></div>
            </div>
        `).join('');
    }

    function drawDiagram(fw, fh, g, hasSplit, splitHeight, orientation) {
        svg.innerHTML = '';
        const padding = 60;
        const availableW = 800 - (padding * 2);
        const availableH = 600 - (padding * 2);

        // Calculate visual scale
        const totalW = fw + g + 2; // + SA
        const totalH = (fh + (g / 2)) * 2 + 2;

        const scale = Math.min(availableW / totalW, availableH / totalH);

        // Let's just draw one side (Front) to make it clear, or the whole cut piece.
        // User asked for "Actual cutting length", so let's draw the largest piece.

        const sa = 1;
        const cutW = (fw + g + 2 * sa) * scale;
        const cutH_total = ((fh + g / 2) * 2 + 2 * sa) * scale;

        const startX = (800 - cutW) / 2;
        const startY = (600 - cutH_total) / 2;

        // Draw Rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', startX);
        rect.setAttribute('y', startY);
        rect.setAttribute('width', cutW);
        rect.setAttribute('height', cutH_total);
        rect.setAttribute('fill', '#fff');
        rect.setAttribute('stroke', '#fb6f92');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('stroke-dasharray', '5,5');
        svg.appendChild(rect);

        // Draw inner line (finished size if no fold)
        // For simplicity, let's show the cut size and labels.

        // Labels
        addLabel(startX + cutW / 2, startY - 15, `${(fw + g + 2 * sa).toFixed(1)} cm (横: 袋口の幅)`, 'middle');
        addLabel(startX - 55, startY + cutH_total / 2, `${((fh + g / 2) * 2 + 2 * sa).toFixed(1)} cm (縦)`, 'middle', true);

        // Split lines if any
        if (hasSplit) {
            // Visualize split
            const subH_actual = (splitHeight + g / 2 + sa); // one side
            // If fold: there are two split lines
            const splitY1 = startY + (subH_actual * scale);
            const splitY2 = startY + cutH_total - (subH_actual * scale);

            drawLine(startX, splitY1, startX + cutW, splitY1);
            drawLine(startX, splitY2, startX + cutW, splitY2);

            addLabel(startX + cutW + 10, startY + (subH_actual * scale / 2), `切り替え布`, 'start');
            addLabel(startX + cutW + 10, startY + cutH_total / 2, `本体`, 'start');
        }

        // Center fold line
        drawLine(startX, startY + cutH_total / 2, startX + cutW, startY + cutH_total / 2, '#ccc');
        addLabel(startX + cutW / 2, startY + cutH_total / 2 + 15, '底の折り目', 'middle', false, '#999', '12px');
    }

    function addLabel(x, y, text, anchor, rotate = false, color = '#fb6f92', size = '14px') {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', y);
        t.setAttribute('text-anchor', anchor);
        t.setAttribute('fill', color);
        t.style.fontSize = size;
        t.style.fontWeight = 'bold';
        t.textContent = text;
        if (rotate) {
            t.setAttribute('transform', `rotate(-90 ${x} ${y})`);
        }
        svg.appendChild(t);
    }

    function drawLine(x1, y1, x2, y2, color = '#fb6f92') {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', x1);
        l.setAttribute('y1', y1);
        l.setAttribute('x2', x2);
        l.setAttribute('y2', y2);
        l.setAttribute('stroke', color);
        l.setAttribute('stroke-width', '1');
        svg.appendChild(l);
    }

    init();
});
