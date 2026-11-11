/* ============================================================
   knowledge.js · 知识卡片数据
   38 张卡片，覆盖工科数学分析主干：极限 / 导数 / 中值定理 / 积分 / 级数 / 多元
   字段说明：
     formula  主公式（LaTeX，可空）
     idea     一句话定位
     cond     成立条件（定理类必填）
     traps    常见错误
     counter  反例 / 陷阱实例
     deps     前置知识点 id
   ============================================================ */

window.KB = (function () {
  const chapters = [
    { id: 'c1', idx: '01', title: '极限与连续', color: '#1D3B63' },
    { id: 'c2', idx: '02', title: '导数与微分', color: '#2C6A50' },
    { id: 'c3', idx: '03', title: '微分中值定理', color: '#8A5A2B' },
    { id: 'c4', idx: '04', title: '不定积分', color: '#6B3A5A' },
    { id: 'c5', idx: '05', title: '定积分', color: '#3A5A6B' },
    { id: 'c6', idx: '06', title: '无穷级数', color: '#7A6420' },
    { id: 'c7', idx: '07', title: '多元函数微分', color: '#4A5C2E' },
    { id: 'c8', idx: '08', title: '重积分', color: '#8A3A32' }
  ];

  const nodes = [

    /* ---------------- 第 1 章 ---------------- */
    {
      id: 'n1', ch: 'c1', title: '数列极限的 ε-N 定义', sub: 'ε-N', level: 'core',
      formula: String.raw`\lim_{n\to\infty}x_n=a\iff \forall\varepsilon>0,\ \exists N\in\mathbb{N},\ \forall n>N:\ |x_n-a|<\varepsilon`,
      idea: '把「无限接近」翻译成可检验的不等式：ε 是任意给定的误差上限，N 是「从第几项起一直落在误差内」的门槛。',
      cond: [
        'ε 是任取的，不是某个很小的具体数',
        'N 依赖 ε：ε 变小，N 一般变大，写成 N(ε)',
        '不等式只需对 n > N 成立，前面有限项不影响极限'
      ],
      traps: [
        '用「n 越来越大，x_n 越来越接近 a」代替证明——这是描述，不是判据',
        '只说「n 足够大」而不构造出 N 与 ε 的关系',
        '把 lim 与不等式随意交换次序：由 x_n → a 推不出 x_n 单调'
      ],
      deps: []
    },
    {
      id: 'n2', ch: 'c1', title: '单调有界准则', sub: '存在性', level: 'core',
      formula: String.raw`\{x_n\}\ \text{单调递增且有上界}\ \Longrightarrow\ \{x_n\}\ \text{收敛}`,
      idea: '不需要预先知道极限值就能断定收敛。递推数列 x_{n+1}=f(x_n) 的标准套路：归纳证有界 → 证单调 → 由 x=f(x) 解出极限。',
      traps: [
        '只说「有界」不够：(-1)^n 有界却发散',
        '只说「单调」不够：n 单调递增但无界',
        '最后令 n→∞ 得 x=f(x) 之前，必须先由本定理保证极限存在，否则等式无意义'
      ],
      deps: ['n1']
    },
    {
      id: 'n3', ch: 'c1', title: '夹逼准则', sub: '放缩', level: 'core',
      formula: String.raw`g_n\le x_n\le h_n,\quad \lim_{n\to\infty}g_n=\lim_{n\to\infty}h_n=A\ \Longrightarrow\ \lim_{n\to\infty}x_n=A`,
      idea: '把难算的数列夹在两个好算的数列之间。核心不在「夹」，而在两侧放缩到同阶。',
      traps: [
        '两侧极限不相等时什么也推不出——放缩过度就失效',
        '夹逼不等式只要求在 n > N 之后成立，不必对一切 n 成立',
        '和式型常配合「n·min ≤ Σ ≤ n·max」使用，但两侧必须真正收敛到同一值'
      ],
      deps: ['n1']
    },
    {
      id: 'n4', ch: 'c1', title: '函数极限 ε-δ', sub: 'ε-δ', level: 'core',
      formula: String.raw`\lim_{x\to a}f(x)=L\iff \forall\varepsilon>0\ \exists\delta>0:\ 0<|x-a|<\delta\Rightarrow|f(x)-L|<\varepsilon`,
      idea: '与 ε-N 完全同构：把「n 足够大」换成「x 足够靠近 a」。注意 0<|x-a| 是去心邻域。',
      cond: [
        '0<|x-a| 表示 x≠a，因此 f 在 a 点有无定义、取什么值都与极限无关',
        'δ 依赖 ε，且一般也依赖 a',
        'x→∞ 型把 0<|x-a|<δ 换成 |x|>X'
      ],
      traps: [
        '把 0<|x-a|<δ 写成 |x-a|<δ，于是把 f(a) 也纳入了约束，证明会卡住',
        '认为极限存在要求函数在 a 点有定义',
        '求 δ 时对 ε 作了额外假设（如 ε<1），须在证明中显式说明并取 min'
      ],
      counter: String.raw`$f(x)=\frac{\sin x}{x}$ 在 $x=0$ 处无定义，但 $\lim_{x\to0}f(x)=1$；$f(x)=1\,(x\ne0),\ f(0)=99$ 的极限仍为 1。`,
      deps: ['n1']
    },
    {
      id: 'n5', ch: 'c1', title: '左右极限与极限存在', sub: '分侧', level: 'core',
      formula: String.raw`\lim_{x\to a}f(x)\ \text{存在}\iff \lim_{x\to a^-}f(x)=\lim_{x\to a^+}f(x)`,
      idea: '分段点、含绝对值或取整的函数，必须分侧讨论。这个等价关系是判断「极限不存在」最常用的工具。',
      traps: [
        '只算出一侧就下结论',
        String.raw`$e^{1/x}$、$\arctan\frac1x$ 在 $x=0$ 两侧趋于不同的值，是「极限不存在」的经典素材`,
        '无穷大不是极限值：写 lim f = ∞ 只表示发散的一种方式'
      ],
      deps: ['n4']
    },
    {
      id: 'n6', ch: 'c1', title: '两个重要极限', sub: 'sin x / x, e', level: 'core',
      formula: String.raw`\lim_{x\to0}\frac{\sin x}{x}=1,\qquad \lim_{x\to\infty}\left(1+\frac1x\right)^{x}=e`,
      idea: '第一个由单位圆面积不等式 sin x < x < tan x 配合夹逼得到；它是 (sin x)′ = cos x 的基础，进而支撑整套三角求导。',
      traps: [
        '用洛必达法则证 lim sin x / x = 1 属于循环论证：法则需要 (sin x)′ = cos x，而该导数正是由这个极限推出的',
        String.raw`$1^{\infty}$ 型要先化为 $e^{\lim(\,\cdot\,-1)\cdot(\,\cdot\,)}$，或取对数后算，不能直接写成 1`,
        '第一个极限只对 x→0 成立；lim sin x / x 当 x→∞ 时为 0'
      ],
      deps: ['n3', 'n4']
    },
    {
      id: 'n7', ch: 'c1', title: '等价无穷小替换', sub: '替换条件', level: 'core',
      formula: String.raw`x\sim\sin x\sim\tan x\sim\arcsin x\sim\arctan x\sim\ln(1+x)\sim e^{x}-1\ (x\to0)`,
      idea: '把复杂无穷小换成幂函数，是求极限最快的工具。成立条件是「两者之比的极限为 1」。',
      cond: [
        '只适用于 x→0（或趋于其他点时先作平移）的无穷小',
        '只能在乘除因子中整体替换，且要替换整个因子，不能只换因子的某一部分'
      ],
      traps: [
        '在加减法中逐项替换：会丢掉主部的高阶项，结果可能整个改变',
        '把 sin x ~ x 用在 x→π 的场合：此时 sin x 不是无穷小'
      ],
      counter: String.raw`$\lim_{x\to0}\frac{\tan x-\sin x}{x^{3}}$：若各自替换成 $x$ 得 $0$；正确做法是 $\tan x(1-\cos x)\sim x\cdot\frac{x^{2}}{2}$，极限为 $\frac12$。`,
      deps: ['n6']
    },
    {
      id: 'n8', ch: 'c1', title: '连续与间断点分类', sub: '三要素', level: 'core',
      formula: String.raw`f\ \text{在}\ x_0\ \text{连续}\iff \lim_{x\to x_0}f(x)=f(x_0)`,
      idea: '连续要同时满足三件事：极限存在、f(x₀) 有定义、二者相等。缺任何一条即为间断。',
      cond: [
        '第一类间断：左右极限都存在（可去型：相等但不等于 f(x₀)；跳跃型：不相等）',
        '第二类间断：至少一侧极限不存在（无穷型、振荡型）'
      ],
      traps: [
        '把「有定义」当作「连续」',
        String.raw`$\sin\frac1x$ 在 $0$ 处是振荡间断（第二类），不是可去间断——它连极限都不存在`,
        String.raw`$x\sin\frac1x$ 在 $0$ 处可去（补定义后连续），与上一条只差一个因子，结论完全不同`
      ],
      deps: ['n4']
    },
    {
      id: 'n9', ch: 'c1', title: '闭区间连续函数的四条性质', sub: '存在性发动机', level: 'core',
      formula: String.raw`f\in C[a,b]\ \Longrightarrow\ \text{有界、取得最值、取遍中间值、异号则必有零点}`,
      idea: '有界性定理、最值定理、介值定理、零点定理。后续几乎所有「存在 ξ 使…」的证明都从这四条出发。',
      cond: [
        '区间必须闭且有界——这是最关键的前提',
        '函数必须在整个闭区间上连续'
      ],
      traps: [
        String.raw`$1/x$ 在 $(0,1]$ 上连续但无界，说明开区间不成立`,
        '介值定理只保证存在，不给出位置，也不保证唯一',
        '零点定理要求两端异号；同号时可能有零点（如 x²−1 在 [2,3] 之外）也可能没有，不能反推'
      ],
      deps: ['n8']
    },

    /* ---------------- 第 2 章 ---------------- */
    {
      id: 'n10', ch: 'c2', title: '导数定义', sub: '局部线性化', level: 'core',
      formula: String.raw`f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}=\lim_{x\to x_0}\frac{f(x)-f(x_0)}{x-x_0}`,
      idea: '导数是一点处的瞬时变化率，几何上就是切线斜率。所有求导公式都由此推出，因此凡是「抽象函数在某点可导」的题都必须回到定义。',
      cond: [
        'f′(x₀) 存在 ⟺ 左导数与右导数都存在且相等',
        '可导 ⇒ 连续；连续 ⇏ 可导'
      ],
      traps: [
        String.raw`把 $\lim_{h\to0}\frac{f(x_0+h)-f(x_0-h)}{2h}$ 直接当作 $f'(x_0)$：该式存在不能保证 $f'(x_0)$ 存在（如 $f=|x|$ 在 0 点，该式为 0 但导数不存在）`,
        '在 x₀ 处不连续则必不可导，先查连续性可省很多力气',
        '分段函数在分界点必须用左右导数定义分别算'
      ],
      deps: ['n8']
    },
    {
      id: 'n11', ch: 'c2', title: '求导法则与链式法则', sub: '复合求导', level: 'core',
      formula: String.raw`(f\circ g)'(x)=f'\big(g(x)\big)\cdot g'(x)`,
      idea: '四则、复合、反函数、隐函数、参数方程五类法则。链式法则是核心：外层导数在里层取值，再乘里层导数。',
      traps: [
        '漏乘内层导数：sin(2x) 的导数是 2cos(2x)，不是 cos(2x)',
        String.raw`隐函数求导要把 $y$ 看作 $x$ 的函数：$y^{2}$ 对 $x$ 求导得 $2y\,y'$，漏掉 $y'$ 是最常见错误`,
        '多层复合要一层层剥，别跳步'
      ],
      deps: ['n10']
    },
    {
      id: 'n12', ch: 'c2', title: '高阶导数与莱布尼茨公式', sub: 'n 阶导', level: 'adv',
      formula: String.raw`(uv)^{(n)}=\sum_{k=0}^{n}\binom{n}{k}u^{(n-k)}v^{(k)}`,
      idea: '与二项式定理同构。求 xⁿeˣ、x²sin x 这类乘积的 n 阶导时，比逐次求导可靠得多。',
      traps: [
        '把 (uv)″ 误写成 u″v″',
        '归纳 n 阶导公式后要用数学归纳法验证，不能只验证前两阶'
      ],
      deps: ['n11']
    },
    {
      id: 'n13', ch: 'c2', title: '微分与线性主部', sub: '可微', level: 'core',
      formula: String.raw`\Delta y=f'(x)\Delta x+o(\Delta x),\qquad dy=f'(x)\,dx`,
      idea: '微分是增量 Δy 的线性主部，用于近似计算与误差估计。一元情形可微与可导等价。',
      traps: [
        String.raw`一元：可微 ⟺ 可导。多元：可微 ⟹ 偏导存在，反之不成立——把一元的结论直接搬到多元是典型错误`,
        'dy 与 Δy 不同，相差一个 o(Δx)；只有当 Δx→0 时才能互换'
      ],
      deps: ['n10']
    },
    {
      id: 'n14', ch: 'c2', title: '导函数不一定连续', sub: '达布定理', level: 'adv',
      formula: String.raw`f(x)=x^{2}\sin\frac1x\ (x\ne0),\quad f(0)=0`,
      idea: '这个函数在 0 处可导且 f′(0)=0，但 f′(x)=2x sin(1/x) − cos(1/x) 在 0 附近无极限。所以「f 可导」推不出「f′ 连续」。',
      cond: [
        '达布定理：导函数具有介值性，即不会出现第一类间断点',
        '但导函数可以有第二类（振荡）间断，甚至无界'
      ],
      traps: [
        '误以为 f 可导 ⇒ f′ 连续，进而在证明中默认 f′ 能用闭区间连续函数的性质',
        String.raw`$x^{2}\sin\frac1{x^{2}}$ 的导数在 0 附近无界，是更强的反例`,
        '达布定理与介值定理不同：它不要求导函数连续'
      ],
      counter: String.raw`$f(x)=x^{2}\sin\frac1x$：可导，$f'(0)=0$，但 $\lim_{x\to0}f'(x)$ 不存在。`,
      deps: ['n10']
    },

    /* ---------------- 第 3 章 ---------------- */
    {
      id: 'n15', ch: 'c3', title: '费马引理', sub: '极值点导数为零', level: 'core',
      formula: String.raw`f\ \text{在}\ x_0\ \text{取极值且在}\ x_0\ \text{可导}\ \Longrightarrow\ f'(x_0)=0`,
      idea: '极值点处切线水平。它是罗尔定理的证明工具：闭区间上的连续函数必取得最值，若最值在内部则导数为零。',
      traps: [
        '反推不成立：f′(x₀)=0 不表示 x₀ 是极值点（x³ 在 0 处）',
        '极值点也可能出现在不可导点（|x| 在 0 处），求极值必须同时检查驻点与不可导点'
      ],
      deps: ['n10', 'n9']
    },
    {
      id: 'n16', ch: 'c3', title: '罗尔中值定理', sub: '水平切线', level: 'core',
      formula: String.raw`\exists\,\xi\in(a,b):\quad f'(\xi)=0`,
      idea: '两端等高，中间必有一处切线水平。它是拉格朗日、柯西、泰勒的源头。',
      cond: [
        'f 在闭区间 [a,b] 上连续',
        'f 在开区间 (a,b) 内可导',
        'f(a) = f(b)'
      ],
      traps: [
        String.raw`三个条件缺一不可。$f(x)=x$ 在 $[0,1]$ 上端点值不等，不存在水平切线`,
        '结论是「存在」，既不保证唯一，也不给出位置',
        '条件是充分而非必要：条件不满足时定理失效，但结论未必不成立——这种情形必须单独论证，不能默认结论错误'
      ],
      counter: String.raw`$f(x)=|x|$ 在 $[-1,1]$ 上连续、端点等值，但在 $0$ 处不可导，罗尔定理不适用。而 $(-1,1)$ 内 $f'\equiv\pm1$，处处不为零，因此<b>根本不存在</b>使 $f'(\xi)=0$ 的 $\xi$——结论确实失败了。这正是"可导"这一条不能去掉的原因。`,
      deps: ['n15', 'n9']
    },
    {
      id: 'n17', ch: 'c3', title: '拉格朗日中值定理', sub: '有限增量', level: 'core',
      formula: String.raw`f(b)-f(a)=f'(\xi)(b-a),\qquad \xi\in(a,b)`,
      idea: '罗尔的推广：把水平弦换成任意弦。它是「用导数控制函数增量」的唯一桥梁，单调性、不等式、误差估计全部由此出发。',
      cond: [
        'f 在 [a,b] 连续，(a,b) 可导',
        'ξ 严格位于开区间内部'
      ],
      traps: [
        '把 ξ 取到端点',
        '试图解出 ξ 的具体值：定理只保证存在',
        String.raw`证明不等式时要注意 $\xi$ 的取值<b>范围</b>（如在 $0<\xi<x$ 内估计 $f'(\xi)$），而不是点值`
      ],
      deps: ['n16']
    },
    {
      id: 'n18', ch: 'c3', title: '柯西中值定理', sub: '两函数之比', level: 'core',
      formula: String.raw`\frac{f(b)-f(a)}{g(b)-g(a)}=\frac{f'(\xi)}{g'(\xi)},\qquad \xi\in(a,b)`,
      idea: '拉格朗日的参数化推广，也是洛必达法则的证明基础。',
      cond: [
        'f, g 在 [a,b] 连续，(a,b) 可导',
        String.raw`$g'(x)\ne0$ 于 $(a,b)$，从而 $g(b)\ne g(a)$，分母不为零`
      ],
      traps: [
        '由两个拉格朗日式相除「证明」柯西：两式中的 ξ 一般不是同一个，这是错误证明',
        String.raw`$g'(x)\ne0$ 的条件不能省，否则分母可能为零`
      ],
      deps: ['n17']
    },
    {
      id: 'n19', ch: 'c3', title: '洛必达法则及其失效', sub: '三个条件', level: 'core',
      formula: String.raw`\lim\frac{f(x)}{g(x)}=\lim\frac{f'(x)}{g'(x)}`,
      idea: '把未定式化为导数之比的极限。它的正确性由柯西中值定理保证，因此三个条件一个都不能少。',
      cond: [
        String.raw`必须是 $\frac00$ 或 $\frac{\infty}{\infty}$ 型未定式`,
        String.raw`在去心邻域内 $f',g'$ 存在且 $g'(x)\ne0$`,
        String.raw`$\lim\frac{f'}{g'}$ 存在（或为 $\infty$）——这一条最容易被忽略`
      ],
      traps: [
        '对不是未定式的式子强行求导：如 $\\lim_{x\\to\\pi/2}\\frac{\\sin x}{x}$ 分子分母都有极限，不是未定式，求导毫无意义',
        '反复使用时忘记每一步都重新验证型别，中途已不是未定式还在求导',
        '第三条件不满足时法则失效，但原极限可能仍然存在——此时必须换方法（泰勒、等价无穷小、夹逼）'
      ],
      counter: String.raw`$\lim_{x\to\infty}\frac{x+\sin x}{x}=1$；但求导后得到 $1+\cos x$，当 $x\to\infty$ 时它<b>没有极限</b>。原极限存在而导数之比不存在，洛必达法则<b>失效</b>——条件是充分非必要。`,
      deps: ['n18']
    },
    {
      id: 'n20', ch: 'c3', title: '泰勒公式与两种余项', sub: '多项式逼近', level: 'core',
      formula: String.raw`f(x)=\sum_{k=0}^{n}\frac{f^{(k)}(x_0)}{k!}(x-x_0)^{k}+R_n(x)`,
      idea: '用多项式局部逼近函数，是求极限、估误差、证不等式的通用重武器。',
      cond: [
        String.raw`佩亚诺余项 $R_n=o\big((x-x_0)^{n}\big)$：只需 $f$ 在 $x_0$ 处 $n$ 阶可导，用于<b>求极限</b>`,
        String.raw`拉格朗日余项 $R_n=\frac{f^{(n+1)}(\xi)}{(n+1)!}(x-x_0)^{n+1}$：需 $n+1$ 阶导，用于<b>估误差、证不等式</b>`
      ],
      traps: [
        '求极限用佩亚诺却去估误差，或估误差用佩亚诺——两者不能互换',
        String.raw`展开阶数不足：抵消后主部仍为零，会得到 $0/0$ 的假象。一般要展开到「抵消后剩余的最低非零阶」`,
        '在 x₀ 之外的点展开时忘记 (x−x₀) 的幂次'
      ],
      deps: ['n17', 'n12']
    },

    /* ---------------- 第 4 章 ---------------- */
    {
      id: 'n21', ch: 'c4', title: '基本积分表与线性性质', sub: '原函数', level: 'core',
      formula: String.raw`\int f(x)\,dx=F(x)+C\iff F'(x)=f(x)`,
      idea: '积分是求导的逆运算，结果必须带任意常数 C。基本表要背到条件反射。',
      traps: [
        '漏写 +C——不定积分与定积分最直观的区别',
        String.raw`$\int\frac{dx}{x}=\ln|x|+C$，绝对值不能丢，否则在负半轴无定义`,
        '原函数存在不要求 f 连续（但连续一定存在原函数）'
      ],
      deps: ['n11']
    },
    {
      id: 'n22', ch: 'c4', title: '换元积分法', sub: '凑微分 / 三角代换', level: 'core',
      formula: String.raw`\int f\big(\varphi(x)\big)\varphi'(x)\,dx=\int f(u)\,du`,
      idea: '第一类换元（凑微分）把复合结构整体看作 u；第二类换元（三角代换、根式代换）用于消去根号。',
      traps: [
        String.raw`换元后忘记换积分限（定积分）或忘记回代（不定积分）`,
        String.raw`三角代换要写清 $t$ 的范围，否则开方时 $\sqrt{a^{2}\sin^{2}t}=a|\sin t|$ 的绝对值会出错`,
        '凑微分时 dx 与 du 的系数关系要算准'
      ],
      deps: ['n21', 'n11']
    },
    {
      id: 'n23', ch: 'c4', title: '分部积分法', sub: 'uv − ∫v du', level: 'core',
      formula: String.raw`\int u\,dv=uv-\int v\,du`,
      idea: '把难积的 ∫u dv 换成好积的 ∫v du。选 u 的经验顺序：反三角 → 对数 → 幂 → 三角 → 指数。',
      traps: [
        'u 与 dv 选反了，越积越复杂',
        String.raw`循环积分（如 $\int e^{x}\sin x\,dx$）要移项解出，不能无限循环`,
        '定积分分部时要带上上下限，别只算原函数'
      ],
      deps: ['n21']
    },

    /* ---------------- 第 5 章 ---------------- */
    {
      id: 'n24', ch: 'c5', title: '定积分的黎曼和定义', sub: '可积性', level: 'core',
      formula: String.raw`\int_a^b f(x)\,dx=\lim_{\lambda\to0}\sum_{i=1}^{n}f(\xi_i)\Delta x_i,\quad \lambda=\max\Delta x_i`,
      idea: '分割、取点、求和、取极限。极限与分割方式、取点方式都无关，这是「可积」的含义。',
      cond: [
        'f 在 [a,b] 上有界是必要的（无界必不可积）',
        '连续 ⇒ 可积；有有限个第一类间断点也可积'
      ],
      traps: [
        '把定积分当成「面积」而忽略有向性：f<0 时积分为负',
        String.raw`用 $\int_a^b$ 表示面积时必须加绝对值或分段`,
        '可积不要求连续，但要求有界'
      ],
      deps: ['n3', 'n9']
    },
    {
      id: 'n25', ch: 'c5', title: '微积分基本定理', sub: '变上限积分', level: 'core',
      formula: String.raw`\frac{d}{dx}\int_a^{x}f(t)\,dt=f(x),\qquad \int_a^b f=F(b)-F(a)`,
      idea: '把「求面积」与「求原函数」这两个看似无关的问题接起来，是整个微积分的枢纽。',
      cond: [
        '变上限求导要求 f 在包含 a 与 x 的区间上连续'
      ],
      traps: [
        String.raw`上限是复合函数时要用链式法则：$\frac{d}{dx}\int_a^{\varphi(x)}f=f\big(\varphi(x)\big)\varphi'(x)$，漏掉 $\varphi'$ 是高频错误`,
        String.raw`上下限都含 $x$ 时要拆成两段：$\int_{\psi(x)}^{\varphi(x)}=\int_a^{\varphi}-\int_a^{\psi}$`,
        'f 有跳跃间断时，变上限函数连续但在该点不可导'
      ],
      deps: ['n24', 'n9']
    },
    {
      id: 'n39', ch: 'c5', title: '积分中值定理', sub: '平均值', level: 'core',
      formula: String.raw`f\in C[a,b]\ \Longrightarrow\ \exists\,\xi\in[a,b]:\ \int_a^b f(x)\,dx=f(\xi)(b-a)`,
      idea: '连续函数在区间上的积分等于「某点的函数值 × 区间长度」，即函数必定取到它的平均值。它把积分这个整体量还原成某一点的局部值。',
      cond: [
        'f 在闭区间 [a,b] 上连续（比微分中值定理弱，不需要可导）',
        String.raw`ξ 可以取到端点，这与拉格朗日定理中 $\xi$ 严格位于内部不同`
      ],
      traps: [
        '把 ξ 当成可以随意指定的点：定理只说存在',
        '只保证「至少一个」ξ，不保证唯一',
        String.raw`用它估计积分值时，要说清 $f(\xi)$ 的取值范围，而不是声称 $\xi$ 的具体位置`
      ],
      counter: String.raw`$\int_0^{2\pi}\sin x\,dx=0$，故平均值 $f(\xi)=0$，即 $\xi=\pi$（在 $(0,2\pi)$ 内）或端点。若误以为 ξ 一定在内部开区间，就会漏掉端点情形。`,
      deps: ['n9', 'n24']
    },
    {
      id: 'n26', ch: 'c5', title: '反常积分与 p 积分', sub: '敛散判别', level: 'core',
      formula: String.raw`\int_1^{\infty}\frac{dx}{x^{p}}\ \text{收敛}\iff p>1;\qquad \int_0^{1}\frac{dx}{x^{p}}\ \text{收敛}\iff p<1`,
      idea: '无穷区间或含瑕点的积分，必须先判敛再计算。判敛主要靠比较判别法与 p 积分作标尺。',
      traps: [
        '直接套牛顿-莱布尼茨：原函数在瑕点可能无界，结果没有意义',
        String.raw`瑕点在区间<b>内部</b>时必须拆成两段分别判敛：$\int_{-1}^{1}\frac{dx}{x^{2}}$ 在 $0$ 处有瑕点，两部分都发散，整体发散`,
        '用奇偶对称性得 0：对发散积分做对称抵消是典型谬误'
      ],
      counter: String.raw`$\int_{-1}^{1}\frac{dx}{x^{2}}=+\infty$。若按奇函数对称性认为等于 $0$，就犯了「对发散积分使用对称性」的错误。`,
      deps: ['n25']
    },

    /* ---------------- 第 6 章 ---------------- */
    {
      id: 'n27', ch: 'c6', title: '级数收敛的必要条件', sub: '通项趋于零', level: 'core',
      formula: String.raw`\sum_{n=1}^{\infty}u_n\ \text{收敛}\ \Longrightarrow\ \lim_{n\to\infty}u_n=0`,
      idea: '只是必要条件，不是充分条件。实际使用时几乎总用它的逆否形式：通项不趋于 0 ⇒ 必发散。',
      traps: [
        String.raw`由 $\lim u_n=0$ 推出收敛——调和级数 $\sum\frac1n$ 通项趋 0 却发散`,
        '判断发散时先看通项，能省大量计算'
      ],
      counter: String.raw`调和级数 $\sum_{n\ge1}\frac1n$：部分和 $\ln n$ 量级增长，通项趋 0 但级数发散。`,
      deps: ['n1']
    },
    {
      id: 'n28', ch: 'c6', title: '正项级数判别法', sub: '比较 / 比值 / 根值', level: 'core',
      formula: String.raw`\lim_{n\to\infty}\frac{u_{n+1}}{u_n}=q<1\Rightarrow\text{收敛};\quad q>1\Rightarrow\text{发散}`,
      idea: '正项级数部分和单调递增，因此「收敛 ⟺ 部分和有界」。所有判别法都围绕估计这个界展开。',
      traps: [
        String.raw`$q=1$ 时比值法完全失效——所有 $p$ 级数都落在这一情形，必须改用比较法或积分法`,
        '比较判别要选对参照：p 级数与几何级数是最常用的两把尺子',
        '比值法适合含阶乘、n 次幂；根值法适合通项是 n 次方的形式'
      ],
      deps: ['n27']
    },
    {
      id: 'n29', ch: 'c6', title: '交错级数与莱布尼茨判别', sub: '单调递减', level: 'core',
      formula: String.raw`u_n\downarrow 0\ \Longrightarrow\ \sum_{n=1}^{\infty}(-1)^{n-1}u_n\ \text{收敛}`,
      idea: '两个条件：通项单调递减、通项趋于 0。这是充分条件，不满足时级数仍可能收敛。',
      traps: [
        '只验证 uₙ→0 就下结论，漏掉单调性——单调性不能省',
        '莱布尼茨判别只判敛，不给出绝对收敛；要另外考察 Σuₙ'
      ],
      counter: String.raw`取 $u_n=\frac1n$（$n$ 奇）、$u_n=\frac1{n^{2}}$（$n$ 偶）：$u_n\to0$ 但不单调，且 $\sum(-1)^{n-1}u_n$ 中奇数项构成调和级数的一部分而发散，故级数发散。说明单调性条件不可去。`,
      deps: ['n27']
    },
    {
      id: 'n30', ch: 'c6', title: '幂级数与收敛半径', sub: 'R 与端点', level: 'core',
      formula: String.raw`R=\lim_{n\to\infty}\left|\frac{a_n}{a_{n+1}}\right|,\qquad |x-x_0|<R\ \text{内绝对收敛}`,
      idea: '幂级数的收敛域永远是「一个区间」，以 x₀ 为中心；半径 R 只保证开区间内绝对收敛，端点必须单独讨论。',
      traps: [
        '算出 R 就以为收敛域是开区间，漏掉端点讨论',
        '逐项求导与逐项积分不改变收敛半径，但可能改变端点的敛散性',
        '在收敛域外做逐项运算（如代入 x=1 求和函数）是无效的'
      ],
      deps: ['n28']
    },
    {
      id: 'n31', ch: 'c6', title: '傅里叶级数与狄利克雷条件', sub: '三角展开', level: 'adv',
      formula: String.raw`f(x)\sim\frac{a_0}{2}+\sum_{n=1}^{\infty}\big(a_n\cos nx+b_n\sin nx\big)`,
      idea: '把周期函数分解为不同频率的正弦、余弦叠加。它是信号处理与频谱分析的数学起点，也是工科数学分析区别于纯分析的落点。',
      cond: [
        '狄利克雷条件：一个周期内连续或只有有限个第一类间断点',
        '一个周期内只有有限个极值点'
      ],
      traps: [
        String.raw`在间断点处级数收敛到左右极限的<b>平均值</b> $\frac{f(x^-)+f(x^+)}{2}$，不是 $f(x)$`,
        '奇偶性没用好：奇函数只含 sin 项，偶函数只含 cos 项，能省一半积分',
        '周期 2l 而非 2π 时，要把 nx 换成 nπx/l，系数也要相应改变'
      ],
      deps: ['n30', 'n23']
    },

    /* ---------------- 第 7 章 ---------------- */
    {
      id: 'n32', ch: 'c7', title: '二重极限与路径', sub: '路径相关', level: 'core',
      formula: String.raw`\lim_{(x,y)\to(x_0,y_0)}f(x,y)=A`,
      idea: '多元极限要求「沿任意路径」都趋于同一值。这比一元严格得多，也是多元反例的主要来源。',
      cond: [
        '证明不存在：找到两条路径给出不同极限即可',
        '证明存在：必须用 ε-δ 或夹逼，不能只验证若干条路径'
      ],
      traps: [
        '沿所有直线趋于同值就断定极限存在——沿直线只是路径的一小部分',
        '极坐标代换后若结果依赖 θ，只能说明沿不同射线极限不同（可判不存在）；若与 θ 无关，仍不能直接断定存在'
      ],
      counter: String.raw`$f(x,y)=\frac{xy^{2}}{x^{2}+y^{4}}$：沿 $y=kx$ 有 $f\to0$；沿 $x=y^{2}$ 有 $f=\frac{y^{4}}{2y^{4}}=\frac12$。两条路径极限不同，故二重极限不存在。`,
      deps: ['n4']
    },
    {
      id: 'n33', ch: 'c7', title: '偏导数', sub: '沿坐标方向', level: 'core',
      formula: String.raw`f_x(x_0,y_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x,y_0)-f(x_0,y_0)}{\Delta x}`,
      idea: '固定其余变量，对某一变量求导。它只反映沿坐标轴方向的变化率。',
      traps: [
        '偏导存在推不出连续——这是与一元最本质的区别',
        '偏导存在推不出可微',
        '求分段函数在分界点的偏导必须用定义，不能直接对表达式求导后代入'
      ],
      counter: String.raw`$f(x,y)=\frac{xy}{x^{2}+y^{2}}$（原点补充 $f(0,0)=0$）：$f_x(0,0)=f_y(0,0)=0$ 都存在，但沿 $y=x$ 有 $f\equiv\frac12\to\frac12\ne f(0,0)$，故在原点不连续。`,
      deps: ['n10', 'n32']
    },
    {
      id: 'n34', ch: 'c7', title: '全微分与可微', sub: '线性主部', level: 'core',
      formula: String.raw`\Delta f=A\Delta x+B\Delta y+o(\rho),\quad \rho=\sqrt{\Delta x^{2}+\Delta y^{2}}`,
      idea: '可微是指函数增量能被线性函数以一阶精度逼近。这是多元微分学的中心概念。',
      cond: [
        '可微 ⇒ 连续，且可微 ⇒ 偏导存在（此时 A=f_x, B=f_y）',
        '偏导连续 ⇒ 可微',
        '反向均不成立：偏导存在 ⇏ 可微；连续 ⇏ 可微'
      ],
      traps: [
        '把「偏导存在」当成「可微」——多元微分最高频的错误',
        String.raw`判可微必须回到定义：验证 $\lim_{\rho\to0}\frac{\Delta f-f_x\Delta x-f_y\Delta y}{\rho}=0$，不能只看偏导是否连续（那只是充分条件）`
      ],
      deps: ['n33', 'n13']
    },
    {
      id: 'n35', ch: 'c7', title: '无条件极值判别', sub: 'AC − B²', level: 'core',
      formula: String.raw`A=f_{xx},B=f_{xy},C=f_{yy};\quad AC-B^{2}>0\Rightarrow\text{极值}\ (A>0\ \text{极小},\ A<0\ \text{极大})`,
      idea: '把驻点代入二阶偏导构成的 Hessian 判别式，类比一元二阶导数判别。',
      traps: [
        'AC−B²<0 是鞍点；=0 时判别法失效，需另用定义或泰勒展开',
        '只在驻点处判别，漏掉偏导不存在的点',
        '求极值前先确认区域是开集，闭区域要额外考察边界'
      ],
      deps: ['n34', 'n15']
    },
    {
      id: 'n36', ch: 'c7', title: '条件极值与拉格朗日乘数法', sub: '约束优化', level: 'core',
      formula: String.raw`\nabla f=\lambda\nabla g,\qquad g(x,y)=0`,
      idea: '在约束曲面上找极值：极值点处 f 的梯度必须与约束面的法向平行，否则沿曲面还能继续上升。',
      traps: [
        '只解 ∇f=λ∇g 的方程组，忘了把约束方程一起解',
        String.raw`漏掉 $\nabla g=0$ 的奇点（约束曲线在此处无定义法向）`,
        '解出多个候选点后必须逐个比较函数值，不能只取一个'
      ],
      deps: ['n35']
    },

    /* ---------------- 第 8 章 ---------------- */
    {
      id: 'n37', ch: 'c8', title: '二重积分与累次积分', sub: '化归', level: 'core',
      formula: String.raw`\iint_{D}f\,d\sigma=\int_a^b\!\!\int_{y_1(x)}^{y_2(x)}f(x,y)\,dy\,dx`,
      idea: '把平面区域上的积分化为两次一元积分。关键是正确写出积分区域的不等式描述，再决定先对谁积。',
      traps: [
        '积分次序选错导致原函数不存在（如 e^{y²} 先对 y 积）',
        '交换次序时上下限要重新由区域确定，不能照搬',
        '区域边界分段时要拆成多个积分'
      ],
      deps: ['n24']
    },
    {
      id: 'n38', ch: 'c8', title: '极坐标变换与雅可比', sub: 'r dr dθ', level: 'core',
      formula: String.raw`\iint_{D}f\,dx\,dy=\iint_{D'}f(r\cos\theta,r\sin\theta)\,r\,dr\,d\theta`,
      idea: '圆形、扇形、环形区域用极坐标可大幅简化。面积元多出的因子 r 来自坐标变换的雅可比行列式。',
      traps: [
        String.raw`漏掉雅可比因子 $r$——这是二重积分最高频的计算错误`,
        String.raw`$\theta$ 的范围由区域决定，不能默认 $0$ 到 $2\pi$；圆环要分段`,
        '被积函数里的 x、y 也要一并替换，不能只换 dxdy'
      ],
      deps: ['n37']
    }
  ];


  /* 检索用关键词索引：口语化的提问往往不出现标题里的字面词，
     这里为高频知识点补充同义说法，供助教匹配使用 */
  const KW = {
    n2: ['单调有界', '单调', '递推数列'],
    n3: ['夹逼', '放缩', '夹逼准则'],
    n4: ['函数极限', 'ε-δ', 'epsilon'],
    n6: ['重要极限', 'sinx/x', 'e的极限'],
    n7: ['等价无穷小', '等价替换', '替换'],
    n8: ['间断', '间断点', '间断点分类'],
    n9: ['闭区间', '最值', '介值', '零点', '一致连续', '有界性'],
    n10: ['可导', '连续', '一定连续', '连续不一定可导', '可导必连续', '连续不可导', '导数定义', '可导性'],
    n13: ['微分', '可微', '线性主部'],
    n14: ['达布', '导函数不连续'],
    n16: ['罗尔', 'rolle'],
    n17: ['拉格朗日', 'lagrange', '中值定理'],
    n18: ['柯西', 'cauchy'],
    n19: ['洛必达', 'lhopital', "l'hopital", '洛必达法则'],
    n20: ['泰勒', 'taylor', '余项', '麦克劳林'],
    n22: ['换元', '代换', '三角代换'],
    n23: ['分部积分'],
    n25: ['变上限', '微积分基本定理', '牛顿-莱布尼茨'],
    n26: ['反常积分', '瑕点', '广义积分', 'p积分'],
    n28: ['比值', '根值', '比较判别', '正项级数', '达朗贝尔'],
    n29: ['交错', '莱布尼茨', '条件收敛'],
    n30: ['幂级数', '收敛半径', '收敛域'],
    n31: ['傅里叶', '频谱', '狄利克雷'],
    n32: ['二重极限', '路径', '二元极限', '多元极限'],
    n33: ['偏导', '偏导数', '偏导存在'],
    n34: ['全微分', '可微', '偏导连续', '可微性'],
    n36: ['条件极值', '乘数', '约束极值'],
    n38: ['极坐标', '雅可比', '面积元']
  };

  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });

  const byChapter = {};
  chapters.forEach(c => { byChapter[c.id] = nodes.filter(n => n.ch === c.id); });

  return { chapters, nodes, byId, byChapter, kw: KW };
})();
