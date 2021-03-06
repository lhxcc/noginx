/**
 * 当前用户是否有编辑权限
 */
const editable = $('#editable').val() === 'true';

// 编辑器单例
let editor;
require.config({ paths: { 'vs': '/noginx/static/monaco-editor/min/vs' }});
require.config({
    'vs/nls' : {
        availableLanguages: {
            '*': 'zh-cn'
        }
    }
});

function switcherInit(el) {
    const switchery = new Switchery(el, {
        color: '#56CC9D',
        size: 'small'
    });
    if (!editable) {
        switchery.disable();
    }
}
document.querySelectorAll('[name="active-checkbox"]').forEach(el => switcherInit(el));

const popoverOptions = {
    trigger: 'hover',
    container: 'body',
    placement: 'top'
};
$('[data-toggle="popover"]').popover(popoverOptions);

let sortable = null;
function draggerInit() {
    if (sortable) {
        sortable.destroy();
    }
    if (document.querySelectorAll('.results tr').length) {
        sortable = new Sortable(document.querySelector('tbody'), {
            handle: '.drag-icon',
            animation: 150,
            scrollSensitivity: 70,
            onEnd: evt => {
                const start = Math.min(evt.oldIndex, evt.newIndex) + 1;
                const end = Math.max(evt.oldIndex, evt.newIndex) + 1;
                if (start === end) {
                    return;
                }

                // 需要重新排序的列表
                const seqList = [];
                for (let i = start - 1; i < end; i++) {
                    const tr = $(`.results tr:eq(${i})`);
                    seqList.push({
                        uid: tr.attr('id'),
                        seq: i + 1
                    });
                }
                $.post('/noginx/seq', {
                    seqList
                }).done(data => {
                    if (data.code === 1) {
                        seqList.forEach(item => {
                            $(`#${item.uid}`).data('sequence', item.seq);
                            $(`#${item.uid}`).attr('data-sequence', item.seq);
                            $(`#${item.uid} .seq`).text(item.seq);
                        });
                    } else {
                        swal({
                            title: '保存失败',
                            text: data.message,
                            icon: 'error',
                            button: {
                                text: '关闭',
                                className: 'btn btn-info'
                            }
                        });
                    }
                }).fail(resp => {
                    swal({
                        title: '保存失败',
                        text: resp.responseText,
                        icon: 'error',
                        button: {
                            text: '关闭',
                            className: 'btn btn-info'
                        }
                    });
                });
            }
        });
    }
}

if (editable) {
    draggerInit();
}

const searcher = new QuickSearch({
    inputSelector: '[type=search]',
    findSelector: '.results tr',
    input: ({ text, find }) => {
        // 显示查找到了多少个结果
        let num = '';
        if (text) {
            num = `${find}个`;
            $('.search-count').css('opacity', '1');
        } else {
            $('.search-count').css('opacity', '0');
        }
        $('.search-count span').text(num);

        // 无数据时显示表足
        const empty = find === 0;
        if (empty) {
            setTimeout(() => {
                $('tfoot').css('display', 'table-row-group');
            }, 0);
        } else {
            $('tfoot').css('display', 'none');
        }
    }
});

// uri 文本框变化
$('#input-uri').on('input', () => {
    $('#input-uri').removeClass('is-invalid');
});

// 切换类型
$('#select-type').on('change', () => {
    const type = $('#select-type').val();
    $('#input-uri').removeClass('is-invalid');
    switch (type) {
        case 'regexp':
            $('#input-uri').attr('placeholder', '正则匹配');
            $('#group-uri').addClass('group-regexp');
            break;
        case 'exact':
            $('#input-uri').attr('placeholder', '完全匹配');
            $('#group-uri').removeClass('group-regexp');
            break;
        default:
            $('#input-uri').attr('placeholder', '匹配开头');
            $('#group-uri').removeClass('group-regexp');
    }
});

$('#btn-show-file').on('click', () => {
    checkIfStaticExists(() => {
        let path = $('#input-path').val();
        if (path.substring(path.length - 1) === '/') {
            path = path.substring(0, path.length - 1);
        }
        showFileList(path);

        // 计算模态框的高度
        const bodyHeight = $('#route-modal .modal-body').outerHeight();
        const newHeight = bodyHeight - 35;
        $('#file-modal .file-list').css('height', `${newHeight}px`);

        // 隐藏上一个模态框，形成翻转效果
        $('#route-modal').css('display', 'none');
        $('#route-modal').removeClass('bounceInDown').addClass('flipInY');
        $('#file-modal').modal('show');
    });
});

// 处理内容 文本框变化
$('#input-content').on('input', () => {
    $('#input-content').removeClass('is-invalid');
});

// 转发服务器 选择项变化
$('#select-content').on('change', () => {
    $('#select-content').removeClass('is-invalid');
});

// 切换处理方式
$('#select-process').on('change', () => {
    const process = $('#select-process').val();
    $('#input-rewrite').val('');
    $('#select-content').val('');
    $('#input-path').removeClass('is-invalid');
    $('#input-rewrite').removeClass('is-invalid');
    $('#select-content').removeClass('is-invalid');
    $('#static-wrap').hide();
    $('#rewrite-wrap').hide();
    $('#forward-wrap').hide();
    $('#custom-wrap').hide();
    if (process === 'forward') {
        $('#forward-wrap').show();
    } else if (process === 'rewrite') {
        $('#rewrite-wrap').show();
        $('#input-rewrite').focus();
    } else if (process === 'custom') {
        $('#custom-wrap').show();
    } else {
        $('#static-wrap').show();
    }
});

$('#input-content-addon').on('click', () => {
    $('#input-content').focus();
});

// 点击新增按钮
$('#btn-new-route').on('click', () => {
    $('#uid').val('');
    $('#route-modal .modal-title').text('新增');
    $('#route-modal').modal();
});

// 点击导出
$('#btn-export').on('click', () => {
    window.location.href = '/noginx/exportRoutes';
});

// 点击导入
$('#btn-import').on('change', () => {
    const file = $('#btn-import')[0].files[0];
    const reader = new FileReader();
    reader.onload = () => {
        $.post('/noginx/importRoutes', {
            data: reader.result
        }).done(data => {
            if (data.code === 1) {
                swal({
                    title: '导入成功',
                    text: `共导入 ${data.data} 条数据`,
                    icon: 'success',
                    closeOnClickOutside: false,
                    button: {
                        text: '刷新',
                        className: 'btn btn-info'
                    }
                }).then(() => {
                    window.location.reload();
                });
            } else {
                swal({
                    title: '导入失败',
                    text: data.message,
                    icon: 'error',
                    button: {
                        text: '关闭',
                        className: 'btn btn-info'
                    }
                });
            }
        }).fail(resp => {
            swal({
                title: '导入失败',
                text: resp.responseText,
                icon: 'error',
                button: {
                    text: '关闭',
                    className: 'btn btn-info'
                }
            });
        });
    };
    reader.readAsDataURL(file);
});

// 点击修改按钮
window.editRoute = uid => {
    $('#uid').val(uid);
    $('#route-modal .modal-title').text('修改');
    $('#route-modal').modal();
};

// 点击切换启用
window.activeRoute = (el, uid) => {
    const active = el.checked;
    $.post('/noginx/active', {
        uid,
        active
    }).done(data => {
        if (data.code === 1) {
            if (data.data.active) {
                $(`#${uid} td`).removeClass('inactive');
            } else {
                $(`#${uid} td`).addClass('inactive');
            }
        } else {
            swal({
                title: '保存失败',
                text: data.message,
                icon: 'error',
                button: {
                    text: '关闭',
                    className: 'btn btn-info'
                }
            });
        }
    }).fail(resp => {
        swal({
            title: '保存失败',
            text: resp.responseText,
            icon: 'error',
            button: {
                text: '关闭',
                className: 'btn btn-info'
            }
        });
    });
};

// 点击删除
window.delRoute = uid => {
    swal({
        title: '确定要删除吗？',
        icon: 'warning',
        buttons: {
            btnCancel: {
                text: '取消',
                className: 'btn btn-default'
            },
            btnConfirm: {
                text: '确认删除',
                className: 'btn btn-danger'
            }
        },
        dangerMode: true
    }).then(value => {
        if (value === 'btnConfirm') {
            $.post('/noginx/del', {
                uid
            }).done(data => {
                if (data.code === 1) {
                    swal({
                        text: '删除成功',
                        icon: 'success',
                        buttons: false,
                        timer: 1000
                    });
                    $(`#${data.data._id}`).remove();
                    if ($('.results tr').length === 0) {
                        $('tfoot').css('display', 'table-row-group');
                    }

                    // 重新触发一次搜索
                    searcher.triggerSearch();
                } else {
                    swal({
                        title: '删除失败',
                        text: data.message,
                        icon: 'error',
                        button: {
                            text: '关闭',
                            className: 'btn btn-info'
                        }
                    });
                }
            }).fail(resp => {
                swal({
                    title: '删除失败',
                    text: resp.responseText,
                    icon: 'error',
                    button: {
                        text: '关闭',
                        className: 'btn btn-info'
                    }
                });
            });
        }
    });
};

// 点击保存按钮
$('#btn-save').on('click', () => {
    const inputUri = $('#input-uri');
    const uri = inputUri.val().trim();
    if (!uri) {
        inputUri.addClass('is-invalid');
        inputUri.focus();
        return;
    }

    const process = $('#select-process').val();
    const inputPath = $('#input-path');
    const inputRewrite = $('#input-rewrite');
    const selectContent = $('#select-content');
    let content = '';  
    if (process === 'rewrite') {
        content = inputRewrite.val().trim();
        if (!content) {
            inputRewrite.addClass('is-invalid');
            inputRewrite.focus();
            return;
        }
    } else if (process === 'forward') {
        content = $('#select-content').val();
        if (!content) {
            selectContent.addClass('is-invalid');
            return;
        }
    } else if (process === 'static') {
        content = inputPath.val().trim();
        content = content.substring(topPath.length + 1);
    }

    $('#btn-save').attr('disabled', 'disabled');
    const uid = $('#uid').val();
    const tryFile = $('#check-tryFile').prop('checked');
    $.post('/noginx/save', {
        uid,
        type: $('#select-type').val(),
        uri,
        method: $('#select-method').val(),
        domainId: $('#select-domain').val(),
        process,
        content,
        tryFile: tryFile ? 'Y' : 'N',
        customStatus: process === 'custom' ? $('#select-status').val() : '',
        customContentType: process === 'custom' ? $('#select-mime').val() : '',
        customMode: process === 'custom' ? $('#select-mode').val() : '',
        customBody: process === 'custom' ? editor.getValue() : '',
        remarks: $('#input-remarks').val()
    }).done(data => {
        if (data.code === 1) {
            let updatedItem;
            if (!uid) {
                // 新增
                $('.results').append(data.data);
                updatedItem = $('.results tr:last');
                $('tfoot').css('display', 'none');
            } else {
                // 修改
                $(`#${uid}`).replaceWith(data.data);
                updatedItem = $(`#${uid}`);
            }

            // 重新触发一次搜索
            searcher.triggerSearch();

            switcherInit(updatedItem.find('[name="active-checkbox"]')[0]);
            updatedItem.find('[data-toggle="popover"]').popover(popoverOptions);
            draggerInit();
            $('#route-modal').modal('hide');
            if (!uid) {
                swal({
                    title: '保存成功',
                    text: '如果存在以 / 开头的兜底规则 (匹配任意请求)，请将新增后的路由规则拖动到兜底规则之前！',
                    icon: 'success',
                    button: {
                        text: '我知道了',
                        className: 'btn btn-info'
                    }
                });
            } else {
                swal({
                    text: '保存成功',
                    icon: 'success',
                    buttons: false,
                    timer: 1000
                });
            }
        } else {
            swal({
                title: '保存失败',
                text: data.message,
                icon: 'error',
                button: {
                    text: '关闭',
                    className: 'btn btn-info'
                }
            });
        }
    }).fail(resp => {
        swal({
            title: '保存失败',
            text: resp.responseText,
            icon: 'error',
            button: {
                text: '关闭',
                className: 'btn btn-info'
            }
        });
    }).always(() => {
        $('#btn-save').removeAttr('disabled');
    });
});

// 初始化编辑器
function initEditor(text, mode) {
    require(['vs/editor/editor.main'], () => {
        if (!editor) {
            editor = monaco.editor.create(document.getElementById('text-body'), {
                model: null,
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true,
                dragAndDrop: false
            });
            $('#line-info').text(`行 1，列 1`);
            editor.onDidChangeCursorPosition(() => {
                let position = editor.getPosition();
                if (!position || !position.lineNumber) {
                    position = {
                        lineNumber: 1,
                        column: 1
                    }
                }
                $('#line-info').text(`行 ${position.lineNumber}，列 ${position.column}`);
            });
        } else {
            const newModel = monaco.editor.createModel(text, mode);
            editor.setModel(newModel);
        }
    });
}
initEditor();

let editorForView;
function initEditorStatic(text, mode) {
    require(['vs/editor/editor.main'], () => {
        if (!editorForView) {
            editorForView = monaco.editor.create(document.getElementById('text-body-static'), {
                model: null,
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true,
                dragAndDrop: false,
                readOnly: true
            });
            $('#line-info-static').text(`行 1，列 1`);
            editorForView.onDidChangeCursorPosition(() => {
                let position = editorForView.getPosition();
                if (!position || !position.lineNumber) {
                    position = {
                        lineNumber: 1,
                        column: 1
                    }
                }
                $('#line-info-static').text(`行 ${position.lineNumber}，列 ${position.column}`);
            });
        } else {
            const newModel = monaco.editor.createModel(text, mode);
            editorForView.setModel(newModel);
        }
    });
}
initEditorStatic();

// 全屏按钮
$('#enter-fullscreen').on('click', () => {
    if (!$('body').hasClass('fullscreen')) {
        $('#route-modal .body-wrap').css('position', 'fixed');
        $('#text-body').css({
            width: $(window).width() + 2,
            height: $(window).height() - 21
        });
        $('#route-modal').css('overflow-y', 'hidden');
        $('#route-modal .modal-dialog').css('transform', 'none');
        $('body').addClass('fullscreen');
    } else {
        $('#route-modal .body-wrap').css('position', 'relative');
        $('#text-body').css({
            width: 'auto',
            height: 200
        });
        $('#route-modal').css('overflow-y', 'auto');
        $('#route-modal .modal-dialog').css('transform', 'translate(0, 0)');
        $('body').removeClass('fullscreen');
    }
});
$('#enter-fullscreen-static').on('click', () => {
    if (!$('body').hasClass('fullscreen')) {
        $('#custom-modal .body-wrap').css('position', 'fixed');
        $('#text-body-static').css({
            width: $(window).width() + 2,
            height: $(window).height() - 21
        });
        $('#custom-modal').css('overflow-y', 'hidden');
        $('#custom-modal .modal-dialog').css('transform', 'none');
        $('body').addClass('fullscreen');
    } else {
        $('#custom-modal .body-wrap').css('position', 'relative');
        $('#text-body-static').css({
            width: 'auto',
            height: 200
        });
        $('#custom-modal').css('overflow-y', 'auto');
        $('#custom-modal .modal-dialog').css('transform', 'translate(0, 0)');
        $('body').removeClass('fullscreen');
    }
});

// 转到行
$('#line-info').on('click', () => {
    editor.getAction('editor.action.gotoLine').run();
});
$('#line-info-static').on('click', () => {
    editorForView.getAction('editor.action.gotoLine').run();
});

// 窗口大小改变需重新计算
$(window).on('resize', () => {
    if ($('body').hasClass('fullscreen')) {
        if ($('#text-body').is(':visible')) {
            $('#text-body').css({
                width: $(window).width() + 2,
                height: $(window).height() - 21
            });
        } else if ($('#text-body-static').is(':visible')) {
            $('#text-body-static').css({
                width: $(window).width() + 2,
                height: $(window).height() - 21
            });
        }
    }
});

// 切换主题
$('#select-theme').on('change', () => {
    const theme = $('#select-theme').val();
    monaco.editor.setTheme(theme);
    let borderColor = '#eee';
    if (theme === 'vs-dark') {
        borderColor = '#1e1e1e';
    }
    $('#text-body').css('border-color', borderColor);
});
$('#select-theme-static').on('change', () => {
    const theme = $('#select-theme-static').val();
    monaco.editor.setTheme(theme);
    let borderColor = '#eee';
    if (theme === 'vs-dark') {
        borderColor = '#1e1e1e';
    }
    $('#text-body-static').css('border-color', borderColor);
});

// 切换响应类型
$('#select-mime').on('change', () => {
    const mime = $('#select-mime').val();
    let mode;
    switch (mime) {
        case 'text/plain':
            mode = 'plaintext';
            break;
        case 'application/json':
            mode = 'json';
            break;
        case 'application/javascript':
            mode = 'javascript';
            break;
        case 'text/css':
            mode = 'css';
            break;
        default:
            mode = 'html';
    }
    $('#select-mode').val(mode).change();
});

// 切换语言模式
$('#select-mode').on('change', () => {
    const text = editor.getValue();
    const mode = $('#select-mode').val();
    initEditor(text, mode);
});
$('#select-mode-static').on('change', () => {
    const text = editorForView.getValue();
    const mode = $('#select-mode-static').val();
    initEditorStatic(text, mode);
});

window.viewCustomRes = uid => {
    const data = $(`#${uid}`).data();
    $('#static-status').val(data.customstatus);
    $('#static-mime').val(data.customcontenttype);
    $('#select-mode-static').val(data.custommode);
    initEditorStatic($(`#${uid} pre`).text(), data.custommode);
    $('#custom-modal').modal('show');
}

// 模态框显示之前填充数据
$('#route-modal').on('show.bs.modal', () => {
    const uid = $('#uid').val();
    $('#input-path').val(topPath);
    $('#input-rewrite').val('');
    $('#select-content').val('');
    $('#input-path').removeClass('is-invalid');
    $('#input-rewrite').removeClass('is-invalid');
    $('#select-content').removeClass('is-invalid');
    $('#static-wrap').hide();
    $('#rewrite-wrap').hide();
    $('#forward-wrap').hide();
    $('#select-status').val('200');
    $('#select-mime').val('text/html');
    $('#select-mode').val('html');
    initEditor('<h3>OK</h3>', 'html');
    if (!uid) {
        // 新增
        $('#select-domain option:first').prop('selected', 'selected');
        $('#select-type').val('start').change();
        $('#select-method').val('');
        $('#input-uri').val('');
        $('#input-uri').removeClass('is-invalid');
        $('#select-process').val('static').change();
        $('#check-tryFile').prop('checked', false);
        $('#input-remarks').val('');
        $('#static-wrap').show();
    } else {
        // 修改
        const data = $(`#${uid}`).data();
        $('#select-domain').val(data.domainid);
        $('#select-type').val(data.type).change();
        $('#select-method').val(data.method);
        $('#input-uri').val(data.uri);
        const process = data.process;
        $('#select-process').val(process).change();
        if (process === 'forward') {
            $('#select-content').val(data.content);
        } else if (process === 'rewrite') {
            $('#input-rewrite').val(data.content);
        } else if (process === 'custom') {
            $('#select-status').val(data.customstatus);
            $('#select-mime').val(data.customcontenttype);
            $('#select-mode').val(data.custommode);
            initEditor($(`#${uid} pre`).text(), data.custommode);
        } else {
            let path = `${topPath}`
            if (data.content) {
                path = `${topPath}/${data.content}`
            }
            $('#input-path').val(path);
        }
        $('#check-tryFile').prop('checked', data.tryfile === 'Y');
        $('#input-remarks').val(data.remarks);
    }
});

// 模态框显示之后聚焦
$('#route-modal').on('shown.bs.modal', () => {
    $('#input-uri').focus();
});

// 模态框隐藏后，恢复默认动画
$('#route-modal').on('hide.bs.modal', () => {
    $('#route-modal').removeClass('flipInY').addClass('bounceInDown');
});

/**
 * 检查 static 目录是否存在（新的测试环境可能缺少该目录，故给出明显提示）
 */
function checkIfStaticExists(cb) {
    $.get(`/noginx/getFiles?path=${topPath}`).done(data => {
        if (data.code === '-1') {
            swal({
                title: '服务器目录异常',
                text: `目录 ${topPath} 似乎不存在，请联系运维创建该目录！`,
                icon: 'error',
                button: {
                    text: '我知道了',
                    className: 'btn btn-info'
                }
            });
        } else {
            if (cb) {
                cb();
            }
        }
    });
}
checkIfStaticExists();

function showFileList(path = topPath) {
    $('.file-list').addClass('cursor-wait');
    $.get(`/noginx/getFiles?path=${path}`).done(data => {
        if (data.code === '1') {
            const currentDirPath = data.data.dirPath;
            $('.current-path').html(currentDirPath);
            $('.current-path').attr('title', currentDirPath);
            const arr = data.data.files.map(item => {
                let className = item.isDir ? 'dir-type' : (item.isFile ? 'file-type' : 'unknown-type');
                if (item.isFile && item.extname) {
                    className += ` file-${item.extname}`;
                } else if (item.isDir) {
                    className += ` dir-${item.name}`;
                }
                if (item.selected) {
                    className += ' active';
                }
                const newPath = `${currentDirPath}/${item.name}`;
                return `<li class="${className}" title="${newPath}" data-path="${newPath}" onclick="fileActive(this${item.isDir ? ', true' : ''});"><p>${item.name}</p></li>`;
            });
            if (currentDirPath !== topPath) {
                let className = 'back-type iconfont';
                const backPath = currentDirPath.substring(0, currentDirPath.lastIndexOf('/'));
                arr.unshift(`<li class="${className}" title="返回上级" data-path="${backPath}"  onclick="fileActive(this, true);"><p>..</p></li>`);
            }
            $('.file-list').html(`<ul>
    ${arr.join('')}
</ul>`);
            $('.file-list').scrollTop(0);
        } else {
            // 当返回错误时，显示根目录
            showFileList();
        }
        $('.file-list').removeClass('cursor-wait');
    }).fail(resp => {
        $('.file-list').removeClass('cursor-wait');
    });;
}

function fileActive(obj, isDir) {
    if (!$(obj).hasClass('disabled')) {
        if ($(obj).data('dblclick') == null) {
            $(obj).data('dblclick', 1);
            setTimeout(function () {
                if ($(obj).data('dblclick') == 1) {
                    // 按钮默认显示确认选择，仅当单击选中的是目录时，才显示打开
                    if ($(obj).hasClass('active')) {
                        $(obj).removeClass('active');
                        $('#btn-confirm-path').html('确认选择');
                    } else {
                        $(obj).siblings().removeClass('active');
                        $(obj).addClass('active');
                        if (isDir) {
                            $('#btn-confirm-path').html('打开...');
                        } else {
                            $('#btn-confirm-path').html('确认选择');
                        }
                    }
                }
                $(obj).data('dblclick', null);
            }, 300);
        } else {
            // 双击
            if (isDir) {
                showFileList($(obj).data('path'));
                $('#btn-confirm-path').html('确认选择');
            }
        }
    }
}

$('#file-modal').on('hide.bs.modal', () => {
    $('#route-modal').css('display', 'block');
});

$('#file-modal').on('hidden.bs.modal', () => {
    $('body').addClass('modal-open');
});

function confirmPath(fullPath) {
    $('#file-modal').modal('hide');
    $('#input-path').val(fullPath);
}

$('#btn-confirm-path').on('click', () => {
    const actived = $('.file-list ul li.active');
    if (actived.length > 0) {
        // 说明选中了一项
        const path = actived.data('path');
        if (actived.hasClass('dir-type') || actived.hasClass('back-type')) {
            showFileList(path);
            $('#btn-confirm-path').html('确认选择');
        } else {
            confirmPath(path);
        }
    } else {
        confirmPath($('.current-path').html());
    }
});

window.onpageshow = evt => {
    if (evt.persisted) {
        location.reload();
    }
};
