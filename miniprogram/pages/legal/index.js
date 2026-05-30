const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    documents: [],
  },

  onLoad() {
    this.loadLegalDocuments();
  },

  loadLegalDocuments() {
    this.setData({ loading: true });
    api.getLegalDocuments()
      .then((data) => {
        const documents = data && data.documents ? [
          data.documents.userAgreement,
          data.documents.privacyPolicy,
          data.documents.reportCompliance,
        ] : [];
        this.setData({ documents, loading: false });
      })
      .catch(() => {
        this.setData({
          loading: false,
          documents: [
            {
              title: '甄算用户协议',
              updatedAt: '2026-05-30',
              sections: [
                { heading: '服务性质', content: '报告仅用于自我整理和一般生活参考。' },
              ],
            },
            {
              title: '甄算隐私政策',
              updatedAt: '2026-05-30',
              sections: [
                { heading: '信息使用范围', content: '信息仅用于登录识别、报告生成、权益扣减、订单履约和安全审查。' },
              ],
            },
            {
              title: '报告分层与风险边界说明',
              updatedAt: '2026-05-30',
              sections: [
                { heading: '高风险边界', content: '不提供医疗、投资、法律等确定性建议。' },
              ],
            },
          ],
        });
      });
  },
});
