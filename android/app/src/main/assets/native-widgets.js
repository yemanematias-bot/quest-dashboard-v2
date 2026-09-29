(() => {
 function publish() {
  if (!window.QuestWidget) return;
  QuestWidget.postMessage(JSON.stringify({dailyQuests, updatedAt:Date.now()}));
 }
 window.questWidgetComplete = function(id) {
  const index = dailyQuests.findIndex(q => q.id === id);
  if (index >= 0 && dailyQuests[index].lastCompleted !== getToday()) {
   renderDailyQuests();
   dailyQuestList.children[index].querySelector(".complete-button").click();
  }
  publish();
 };
 window.addEventListener("quest-local-save", publish);
 document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderAll(); publish(); } });
 setInterval(publish, 60000);
 publish();
})();
