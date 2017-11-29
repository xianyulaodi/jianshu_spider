
 // https://github.com/sail-sail/ejsExcel   excel表格

var index = (function(win,$) {
  function sendAjax() {
    var startTime = $('#startTime').val();
    var endTime = $('#endTime').val();
    if(!startTime || !endTime) {
      alert('开始时间和结束时间都需要选择');
      return false;
    }
    startTime = new Date(startTime).setHours(0);
    startTime = new Date(startTime).setMinutes(0);
    startTime = new Date(startTime).setSeconds(0);
    endTime = new Date(endTime).setHours(23);
    endTime = new Date(endTime).setMinutes(59);
    endTime = new Date(endTime).setSeconds(59);
    $.ajax({
      url : '/spider',
      type: 'post',
      data: {
        startTime: startTime,
        endTime: endTime
      },
      dataType: 'json',
      beforeSend: function() {
        $('#loading').show();
        $('#content').hide();
      },
      success : function(res) {
        render(res.data,res.sumUpData);
      },
      error:function(error){
        $('#loading').hide();
        alert('出错了，请刷新后重试');
      }
    });      
  }
  
  function render(data,sumUpData) {
    $('#loading').hide();
    $('#content').show();
    var htmlArr = [];
    var sumUpHtml = [];
    data.forEach(function(item,index) {
      var html=  '<tr>'+
                    '<td>'+ (index+1) +'</td>'+
                    '<td>'+ item.author +'</td>'+
                    '<td>'+ item.title +'</td>'+
                    '<td>'+ item.wordage +'</td>'+
                    '<td>'+ item.publishTime +'</td>'+
                  '</tr>';  
      htmlArr.push(html)  ;  
    });    
    sumUpData.forEach(function(item,index) {
      var html=  '<tr>'+
                    '<td>'+ item.name +'</td>'+
                    '<td>'+ item.num +'</td>'+
                    '<td>'+ item.wordageNum +'</td>'+
                  '</tr>';  
      sumUpHtml.push(html);  
    });    
    $('#tbody').html(htmlArr.join(''));
    $('#tbody2').html(sumUpHtml.join(''));
  }


  $('#submit').click(function() {
    sendAjax();
  });
    
})(window,jQuery)