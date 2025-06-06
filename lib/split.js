/*! Split.js - v1.5.10 */
!function(e, t) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : e.Split = t()
}(this, function() {
    "use strict";
    var L = window
      , T = L.document
      , N = "addEventListener"
      , R = "removeEventListener"
      , q = "getBoundingClientRect"
      , H = "horizontal"
      , I = function() {
        return !1
    }
      , W = L.attachEvent && !L[N]
      , i = ["", "-webkit-", "-moz-", "-o-"].filter(function(e) {
        var t = T.createElement("div");
        return t.style.cssText = "width:" + e + "calc(9px)",
        !!t.style.length
    }).shift() + "calc"
      , s = function(e) {
        return "string" == typeof e || e instanceof String
    }
      , X = function(e) {
        if (s(e)) {
            var t = T.querySelector(e);
            if (!t)
                throw new Error("Selector " + e + " did not match a DOM element");
            return t
        }
        return e
    }
      , Y = function(e, t, n) {
        var r = e[t];
        return void 0 !== r ? r : n
    }
      , G = function(e, t, n, r) {
        if (t) {
            if ("end" === r)
                return 0;
            if ("center" === r)
                return e / 2
        } else if (n) {
            if ("start" === r)
                return 0;
            if ("center" === r)
                return e / 2
        }
        return e
    }
      , J = function(e, t) {
        var n = T.createElement("div");
        return n.className = "gutter gutter-" + t,
        n
    }
      , K = function(e, t, n) {
        var r = {};
        return s(t) ? r[e] = t : r[e] = W ? t + "%" : i + "(" + t + "% - " + n + "px)",
        r
    }
      , P = function(e, t) {
        var n;
        return (n = {})[e] = t + "px",
        n
    };
    return function(e, i) {
        void 0 === i && (i = {});
        var u, t, s, o, r, a, l = e;
        Array.from && (l = Array.from(l));
        var c = X(l[0]).parentNode
          , n = getComputedStyle ? getComputedStyle(c) : null
          , f = n ? n.flexDirection : null
          , m = Y(i, "sizes") || l.map(function() {
            return 100 / l.length
        })
          , h = Y(i, "minSize", 100)
          , d = Array.isArray(h) ? h : l.map(function() {
            return h
        })
          , g = Y(i, "expandToMin", !1)
          , v = Y(i, "gutterSize", 10)
          , p = Y(i, "gutterAlign", "center")
          , y = Y(i, "snapOffset", 30)
          , z = Y(i, "dragInterval", 1)
          , S = Y(i, "direction", H)
          , b = Y(i, "cursor", S === H ? "col-resize" : "row-resize")
          , _ = Y(i, "gutter", J)
          , E = Y(i, "elementStyle", K)
          , w = Y(i, "gutterStyle", P);
        function k(t, e, n, r) {
            var i = E(u, e, n, r);
            Object.keys(i).forEach(function(e) {
                t.style[e] = i[e]
            })
        }
        function x() {
            return a.map(function(e) {
                return e.size
            })
        }
        function M(e) {
            return "touches"in e ? e.touches[0][t] : e[t]
        }
        function U(e) {
            var t = a[this.a]
              , n = a[this.b]
              , r = t.size + n.size;
            t.size = e / this.size * r,
            n.size = r - e / this.size * r,
            k(t.element, t.size, this._b, t.i),
            k(n.element, n.size, this._c, n.i)
        }
        function O() {
            var e = a[this.a].element
              , t = a[this.b].element
              , n = e[q]()
              , r = t[q]();
            this.size = n[u] + r[u] + this._b + this._c,
            this.start = n[s],
            this.end = n[o]
        }
        function C(s) {
            var o = function(e) {
                if (!getComputedStyle)
                    return null;
                var t = getComputedStyle(e);
                if (!t)
                    return null;
                var n = e[r];
                return 0 === n ? null : n -= S === H ? parseFloat(t.paddingLeft) + parseFloat(t.paddingRight) : parseFloat(t.paddingTop) + parseFloat(t.paddingBottom)
            }(c);
            if (null === o)
                return s;
            if (d.reduce(function(e, t) {
                return e + t
            }, 0) > o)
                return s;
            var a = 0
              , u = []
              , e = s.map(function(e, t) {
                var n = o * e / 100
                  , r = G(v, 0 === t, t === s.length - 1, p)
                  , i = d[t] + r;
                return n < i ? (a += i - n,
                u.push(0),
                i) : (u.push(n - i),
                n)
            });
            return 0 === a ? s : e.map(function(e, t) {
                var n = e;
                if (0 < a && 0 < u[t] - a) {
                    var r = Math.min(a, u[t] - a);
                    a -= r,
                    n = e - r
                }
                return n / o * 100
            })
        }
        function D(e) {
            if (!("button"in e && 0 !== e.button)) {
                var t = this
                  , n = a[t.a].element
                  , r = a[t.b].element;
                t.dragging || Y(i, "onDragStart", I)(x()),
                e.preventDefault(),
                t.dragging = !0,
                t.move = function(e) {
                    var t, n = a[this.a], r = a[this.b];
                    this.dragging && (t = M(e) - this.start + (this._b - this.dragOffset),
                    1 < z && (t = Math.round(t / z) * z),
                    t <= n.minSize + y + this._b ? t = n.minSize + this._b : t >= this.size - (r.minSize + y + this._c) && (t = this.size - (r.minSize + this._c)),
                    U.call(this, t),
                    Y(i, "onDrag", I)())
                }
                .bind(t),
                t.stop = function() {
                    var e = this
                      , t = a[e.a].element
                      , n = a[e.b].element;
                    e.dragging && Y(i, "onDragEnd", I)(x()),
                    e.dragging = !1,
                    L[R]("mouseup", e.stop),
                    L[R]("touchend", e.stop),
                    L[R]("touchcancel", e.stop),
                    L[R]("mousemove", e.move),
                    L[R]("touchmove", e.move),
                    e.stop = null,
                    e.move = null,
                    t[R]("selectstart", I),
                    t[R]("dragstart", I),
                    n[R]("selectstart", I),
                    n[R]("dragstart", I),
                    t.style.userSelect = "",
                    t.style.webkitUserSelect = "",
                    t.style.MozUserSelect = "",
                    t.style.pointerEvents = "",
                    n.style.userSelect = "",
                    n.style.webkitUserSelect = "",
                    n.style.MozUserSelect = "",
                    n.style.pointerEvents = "",
                    e.gutter.style.cursor = "",
                    e.parent.style.cursor = "",
                    T.body.style.cursor = ""
                }
                .bind(t),
                L[N]("mouseup", t.stop),
                L[N]("touchend", t.stop),
                L[N]("touchcancel", t.stop),
                L[N]("mousemove", t.move),
                L[N]("touchmove", t.move),
                n[N]("selectstart", I),
                n[N]("dragstart", I),
                r[N]("selectstart", I),
                r[N]("dragstart", I),
                n.style.userSelect = "none",
                n.style.webkitUserSelect = "none",
                n.style.MozUserSelect = "none",
                n.style.pointerEvents = "none",
                r.style.userSelect = "none",
                r.style.webkitUserSelect = "none",
                r.style.MozUserSelect = "none",
                r.style.pointerEvents = "none",
                t.gutter.style.cursor = b,
                t.parent.style.cursor = b,
                T.body.style.cursor = b,
                O.call(t),
                t.dragOffset = M(e) - t.end
            }
        }
        S === H ? (u = "width",
        t = "clientX",
        s = "left",
        o = "right",
        r = "clientWidth") : "vertical" === S && (u = "height",
        t = "clientY",
        s = "top",
        o = "bottom",
        r = "clientHeight"),
        m = C(m);
        var A = [];
        function j(e) {
            var t = e.i === A.length
              , n = t ? A[e.i - 1] : A[e.i];
            O.call(n);
            var r = t ? n.size - e.minSize - n._c : e.minSize + n._b;
            U.call(n, r)
        }
        function F(e) {
            var s = C(e);
            s.forEach(function(e, t) {
                if (0 < t) {
                    var n = A[t - 1]
                      , r = a[n.a]
                      , i = a[n.b];
                    r.size = s[t - 1],
                    i.size = e,
                    k(r.element, r.size, n._b),
                    k(i.element, i.size, n._c)
                }
            })
        }
        function B(n, r) {
            A.forEach(function(t) {
                if (!0 !== r ? t.parent.removeChild(t.gutter) : (t.gutter[R]("mousedown", t._a),
                t.gutter[R]("touchstart", t._a)),
                !0 !== n) {
                    var e = E(u, t.a.size, t._b);
                    Object.keys(e).forEach(function(e) {
                        a[t.a].element.style[e] = "",
                        a[t.b].element.style[e] = ""
                    })
                }
            })
        }
        return (a = l.map(function(e, t) {
            var n, r, i, s = {
                element: X(e),
                size: m[t],
                minSize: d[t],
                i: t
            };
            if (0 < t && ((n = {
                a: t - 1,
                b: t,
                dragging: !1,
                direction: S,
                parent: c
            })._b = G(v, t - 1 == 0, !1, p),
            n._c = G(v, !1, t === l.length - 1, p),
            "row-reverse" === f || "column-reverse" === f)) {
                var o = n.a;
                n.a = n.b,
                n.b = o
            }
            if (!W && 0 < t) {
                var a = _(t, S, s.element);
                r = a,
                i = w(u, v, t),
                Object.keys(i).forEach(function(e) {
                    r.style[e] = i[e]
                }),
                n._a = D.bind(n),

                a[N]("mousedown", n._a),
                a[N]("touchstart", n._a, { passive: true }),
                c.insertBefore(a, s.element),
                n.gutter = a
            }
            return k(s.element, s.size, G(v, 0 === t, t === l.length - 1, p)),
            0 < t && A.push(n),
            s
        })).forEach(function(e) {
            var t = e.element[q]()[u];
            t < e.minSize && (g ? j(e) : e.minSize = t)
        }),
        W ? {
            setSizes: F,
            destroy: B
        } : {
            setSizes: F,
            getSizes: x,
            collapse: function(e) {
                j(a[e])
            },
            destroy: B,
            parent: c,
            pairs: A
        }
    }
});
