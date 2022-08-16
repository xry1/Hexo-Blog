---
robots: noindex,nofollow
sitemap: false
menu_id: notes
layout: wiki
wiki: Notes
title: Idea 相关问题
order: 101

---

{% folding JDK18 下 Console 乱码问题 %}

## JDK18 下 Console 乱码问题

### 先汇总了一下网上觉得合理的解释

https://blog.csdn.net/qq_63012773/article/details/124729185

https://juejin.cn/post/7091696932250189831

新的JDK18（可能也包括以后的）字符集默认是utf-8了，而原先是GBK，而GBK可以用UTF-8解析，而控制台则是GBK，这个时候改成了UTF-8，控制台就用GBK方式解析UTF-8了。因此如果各种乱码处理问题都弄不好，一定是JDK18新版本的问题。怎么调整呢？把File encoding的地方全部变成GBK，就可以正常输出了。
而剩下原边版本的JDK就要用老办法了（网上一搜就有）。



编码和解码是采用了不同的或者是不兼容的编码方案。jdk18乱码由于jdk18编码是GBK，解码却是UTF-8，编码和解码是采用了不同的或者是不兼容的编码方案，这会导致控制台输出中文乱码。


{% endfolding %}

{% folding 测试 %}

## 测试

一次伟大测试:alien:


{% endfolding %}