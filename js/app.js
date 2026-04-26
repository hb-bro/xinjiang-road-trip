/**
 * 南疆旅游路书 - 主脚本
 * 纯原生 JS，兼容微信内置浏览器
 */

(function () {
  'use strict';

  /* ========================================
   * 1. 折叠面板（手风琴/Accordion）
   * 点击 .collapsible-header 切换父级
   * .collapsible-section 的 .active 状态
   * ======================================== */
  function initCollapsible() {
    var headers = document.querySelectorAll('.collapsible-header');
    for (var i = 0; i < headers.length; i++) {
      headers[i].addEventListener('click', function () {
        var section = this.parentElement;
        if (!section || !section.classList.contains('collapsible-section')) return;
        section.classList.toggle('active');
      });
    }
  }

  /* ========================================
   * 2. 平滑滚动（页内锚点链接）
   * 兼容不支持 smooth behavior 的浏览器
   * ======================================== */
  function initSmoothScroll() {
    // 获取所有指向页内锚点的链接
    var links = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;

        var target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        smoothScrollTo(target);
      });
    }
  }

  /**
   * 兼容性平滑滚动到指定元素
   * @param {Element} target - 目标 DOM 元素
   */
  function smoothScrollTo(target) {
    var targetY = target.getBoundingClientRect().top + window.pageYOffset - 60;

    // 优先使用原生 smooth scroll
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } else {
      // 降级：手动实现平滑滚动动画
      var startY = window.pageYOffset;
      var diff = targetY - startY;
      var duration = 400;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        // 缓动函数 easeInOutQuad
        var ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        window.scrollTo(0, startY + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    }
  }

  /* ========================================
   * 3. 底部标签导航栏高亮
   * 根据当前页面 URL 自动高亮对应标签
   * ======================================== */
  function initBottomNav() {
    var tabs = document.querySelectorAll('.bottom-nav .tab-item, .bottom-nav .bottom-nav-item, .bottom-nav .bottom-nav__item');
    if (!tabs.length) return;

    var currentPath = window.location.pathname;
    // 取文件名部分用于匹配
    var currentPage = currentPath.split('/').pop() || 'index.html';

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var href = tab.getAttribute('href') || '';
      var tabPage = href.split('/').pop();

      // 移除所有激活状态
      tab.classList.remove('active');

      // 匹配当前页面则高亮
      if (tabPage === currentPage) {
        tab.classList.add('active');
      }
    }
  }

  /* ========================================
   * 3b. iOS 风格导航栏滚动折叠
   * 当页面滚动超过 .page-hero 的大标题时，
   * 顶部 .nav-bar 添加 is-scrolled，显示分隔线+标题
   * ======================================== */
  function initNavBarScroll() {
    var navBar = document.querySelector('.nav-bar');
    if (!navBar) return;

    var pageHero = document.querySelector('.page-hero');
    // 触发阈值：hero 标题滚出视口时触发
    var threshold = 1;
    if (pageHero) {
      // 大致在标题中段位置触发（标题行高+padding）
      threshold = Math.max(pageHero.offsetTop + 60, 40);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (window.pageYOffset > threshold) {
          navBar.classList.add('is-scrolled');
        } else {
          navBar.classList.remove('is-scrolled');
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ========================================
   * 4. 回到顶部按钮
   * 向下滚动超过 300px 时显示，点击平滑回到顶部
   * ======================================== */
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    // 监听滚动，控制按钮显示/隐藏
    var scrollThreshold = 300;
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > scrollThreshold) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    // 点击回到顶部
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // 降级动画
        var startY = window.pageYOffset;
        var duration = 400;
        var startTime = null;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / duration, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          window.scrollTo(0, startY * (1 - ease));
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }
        requestAnimationFrame(step);
      }
    });
  }

  /* ========================================
   * 5. 每日行程导航（上一天/下一天）
   * 根据当前页面文件名中的数字推算前后页面
   * ======================================== */

  /**
   * 跳转到前一天的行程页面
   */
  function prevDay() {
    navigateDay(-1);
  }

  /**
   * 跳转到后一天的行程页面
   */
  function nextDay() {
    navigateDay(1);
  }

  /**
   * 行程日导航核心逻辑
   * @param {number} offset - 偏移量，-1 为前一天，+1 为后一天
   */
  function navigateDay(offset) {
    var currentPath = window.location.pathname;
    var fileName = currentPath.split('/').pop();

    // 匹配文件名中的数字，如 day1.html -> 1
    var match = fileName.match(/day(\d+)/i);
    if (!match) return;

    var currentDay = parseInt(match[1], 10);
    var targetDay = currentDay + offset;

    // 防止导航到不存在的页面（至少第 1 天）
    if (targetDay < 1) return;

    var newFileName = fileName.replace(/day\d+/i, 'day' + targetDay);
    var newPath = currentPath.replace(fileName, newFileName);

    window.location.href = newPath;
  }

  // 暴露到全局，供 HTML 中 onclick 调用
  window.prevDay = prevDay;
  window.nextDay = nextDay;

  /* ========================================
   * 6. 图片懒加载
   * 使用 IntersectionObserver 实现，
   * 图片需设置 data-src 属性存放真实地址
   * ======================================== */
  function initLazyLoad() {
    var lazyImages = document.querySelectorAll('img[data-src]');
    if (!lazyImages.length) return;

    // 检查浏览器是否支持 IntersectionObserver
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var img = entries[i].target;
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        }
      }, {
        // 提前 200px 开始加载，提升体验
        rootMargin: '200px 0px'
      });

      for (var i = 0; i < lazyImages.length; i++) {
        observer.observe(lazyImages[i]);
      }
    } else {
      // 降级：不支持 Observer 的浏览器直接加载所有图片
      for (var j = 0; j < lazyImages.length; j++) {
        lazyImages[j].src = lazyImages[j].getAttribute('data-src');
        lazyImages[j].removeAttribute('data-src');
      }
    }
  }

  /* ========================================
   * 7. 预算计算器
   * 读取带有 data-cost 属性的元素，
   * 按天汇总并计算总预算
   * ======================================== */
  function initBudgetCalculator() {
    var costItems = document.querySelectorAll('[data-cost]');
    if (!costItems.length) return;

    var totalCost = 0;
    var dailyCosts = {}; // 按天分组汇总

    for (var i = 0; i < costItems.length; i++) {
      var item = costItems[i];
      var cost = parseFloat(item.getAttribute('data-cost')) || 0;
      var day = item.getAttribute('data-day') || '其他';

      totalCost += cost;

      if (!dailyCosts[day]) {
        dailyCosts[day] = 0;
      }
      dailyCosts[day] += cost;
    }

    // 更新每日小计显示
    var dailyTotalEls = document.querySelectorAll('[data-daily-total]');
    for (var j = 0; j < dailyTotalEls.length; j++) {
      var el = dailyTotalEls[j];
      var dayKey = el.getAttribute('data-daily-total');
      if (dailyCosts[dayKey] !== undefined) {
        el.textContent = dailyCosts[dayKey].toFixed(0);
      }
    }

    // 更新总花费显示
    var totalEl = document.getElementById('budget-total');
    if (totalEl) {
      totalEl.textContent = totalCost.toFixed(0);
    }

    // 更新人均花费（如果页面有人数设置）
    var perPersonEl = document.getElementById('budget-per-person');
    var personCountEl = document.getElementById('person-count');
    if (perPersonEl && personCountEl) {
      var count = parseInt(personCountEl.value || personCountEl.textContent, 10) || 1;
      perPersonEl.textContent = Math.ceil(totalCost / count);
    }
  }

  /* ========================================
   * 8. 分享功能
   * 复制当前页面链接到剪贴板（微信内分享）
   * ======================================== */
  function shareUrl() {
    var url = window.location.href;

    // 优先尝试现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('链接已复制，快去分享给小伙伴吧！');
      }).catch(function () {
        // 失败时使用降级方案
        fallbackCopyToClipboard(url);
      });
    } else {
      fallbackCopyToClipboard(url);
    }
  }

  /**
   * 降级复制方案：创建临时 textarea 执行 execCommand
   * 兼容微信内置浏览器
   * @param {string} text - 要复制的文本
   */
  function fallbackCopyToClipboard(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    // 移出可视区域，避免页面跳动
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      var success = document.execCommand('copy');
      if (success) {
        showToast('链接已复制，快去分享给小伙伴吧！');
      } else {
        showToast('复制失败，请长按链接手动复制');
      }
    } catch (err) {
      showToast('复制失败，请长按链接手动复制');
    }

    document.body.removeChild(textarea);
  }

  /**
   * 显示轻提示（Toast）
   * @param {string} message - 提示文字
   * @param {number} [duration=2000] - 显示时长（毫秒）
   */
  function showToast(message, duration) {
    duration = duration || 2000;

    // 移除已有的 toast，避免重叠
    var existing = document.getElementById('app-toast');
    if (existing) {
      existing.parentElement.removeChild(existing);
    }

    var toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'bottom:100px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(0,0,0,0.75)',
      'color:#fff',
      'padding:10px 24px',
      'border-radius:20px',
      'font-size:14px',
      'z-index:10000',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.3s'
    ].join(';');

    document.body.appendChild(toast);

    // 强制重排后再改 opacity，确保过渡动画生效
    toast.offsetHeight; // eslint-disable-line no-unused-expressions
    toast.style.opacity = '1';

    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // 暴露到全局，供按钮 onclick 调用
  window.shareUrl = shareUrl;

  /* ========================================
   * 9. 页面加载动画
   * 卡片元素滚动进入视口时淡入显示
   * ======================================== */
  function initScrollAnimation() {
    var cards = document.querySelectorAll('.card, .fade-in');
    if (!cards.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('visible');
            observer.unobserve(entries[i].target);
          }
        }
      }, {
        threshold: 0.1 // 元素露出 10% 时触发
      });

      for (var i = 0; i < cards.length; i++) {
        // 初始状态：隐藏
        cards[i].classList.add('animate-on-scroll');
        observer.observe(cards[i]);
      }
    } else {
      // 降级：不支持 Observer 的浏览器直接显示所有卡片
      for (var j = 0; j < cards.length; j++) {
        cards[j].classList.add('visible');
      }
    }
  }

  /* ========================================
   * 10. 导航栏当前页面高亮
   * 检测当前 URL 并为匹配的导航链接添加 active 类
   * ======================================== */
  function initActiveNav() {
    var navLinks = document.querySelectorAll('.nav-link, .sidebar-link, nav a');
    if (!navLinks.length) return;

    var currentPath = window.location.pathname;
    var currentPage = currentPath.split('/').pop() || 'index.html';

    for (var i = 0; i < navLinks.length; i++) {
      var link = navLinks[i];
      var href = link.getAttribute('href') || '';
      var linkPage = href.split('/').pop();

      link.classList.remove('active');

      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    }
  }

  /* ========================================
   * 11. 美食卡片展开/收起
   * 点击美食卡片切换详情信息的显示
   * ======================================== */
  function initFoodCards() {
    var foodCards = document.querySelectorAll('.food-card');
    if (!foodCards.length) return;

    for (var i = 0; i < foodCards.length; i++) {
      foodCards[i].addEventListener('click', function () {
        // 切换当前卡片的展开状态
        this.classList.toggle('expanded');

        // 找到卡片内的详情区域并切换显示
        var detail = this.querySelector('.food-detail');
        if (detail) {
          if (this.classList.contains('expanded')) {
            // 展开：设置高度动画
            detail.style.maxHeight = detail.scrollHeight + 'px';
            detail.style.opacity = '1';
          } else {
            // 收起
            detail.style.maxHeight = '0';
            detail.style.opacity = '0';
          }
        }
      });
    }
  }

  /* ========================================
   * 初始化入口
   * DOM 加载完成后依次初始化所有功能模块
   * ======================================== */
  function init() {
    initCollapsible();
    initSmoothScroll();
    initBottomNav();
    initNavBarScroll();
    initBackToTop();
    initLazyLoad();
    initBudgetCalculator();
    initScrollAnimation();
    initActiveNav();
    initFoodCards();
  }

  // 确保 DOM 就绪后再执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM 已就绪（脚本在 body 底部或 defer 加载时）
    init();
  }

})();
