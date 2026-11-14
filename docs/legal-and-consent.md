# 약관 원문과 동의 동선

2026-11-14 초안. 프런트의 `src/app/demo/legalDocuments.json`은 백엔드 `src/main/resources/legal/2026-11-14.json`과 동일한 데모 사본이다. 운영 모드의 `/terms`는 항상 백엔드 `GET /api/v1/consents/documents` 응답을 표시한다. 문서 버전, 시행일, 조문, 필수 여부는 서버 원문을 기준으로 한다. 배포 시 두 사본의 체크섬이 같아야 한다.

필수 3종(서비스, 일반 개인정보, 민감정보)은 원문 끝까지 읽고 각각 동의한다. 마케팅은 선택이다. 서버는 사용자·문서 ID·버전·결정·결정 시각을 개별 행으로 기록하며, 필수 동의가 없으면 프로필 저장을 거부한다. 이전 버전의 동의는 새 버전 동의를 대신하지 않는다.

## 작성 근거

- [개인정보 보호법 제15조](https://law.go.kr/lsLawLinkInfo.do?ancYnChk=0&chrClsCd=010202&lsJoLnkSeq=1006184341): 수집·이용 목적, 항목, 보유 기간, 동의 거부와 영향 고지.
- [개인정보 보호법 제23조](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1006185763): 건강·종교 관련 민감정보는 다른 개인정보와 별도 동의.
- [개인정보 보호법 제21조](https://law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029334977): 목적 달성·보유 기간 종료 시 파기.
- [정보통신망법 제50조](https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025127785): 광고성 정보의 사전 동의와 수신 거부.
- [약관규제법 제3조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025032403): 약관의 명시·중요 내용 설명.
- [개인정보 보호법 제22조의2](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029334873): 만 14세 미만 아동의 법정대리인 동의.
- [개인정보 보호법 시행령 제17조의2](https://www.law.go.kr/lsPdfPrint.do?efYd=20230915&joAllCheck=Y&lsiSeq=254693): 법정대리인 동의 확인 방법. 약관 전문을 이메일로 보내고 명시적인 동의 답장을 받는 방법 등을 규정한다.

## 공개 전 확인

이 원고는 법률 및 현재 코드에 맞춘 개발 초안이며, `support@han-spoon.com`은 사용자가 지정한 주소이므로 발송·수신 가능 여부를 운영자가 확인해야 한다. 사업자 공식 명칭, 제3자 제공·국외 이전·처리 위탁 및 만 14세 미만 법정대리인 동의 확인 절차도 운영 주체가 확인해야 한다. 만 14세 미만은 운영자가 이메일 답장으로 법정대리인 동의를 확인하고 승인 코드를 등록해야 Google 로그인으로 진행한다. 승인 코드 발급과 철회는 수동 운영 절차이며, 운영 준비 전에는 아동 가입 경로를 공개하지 않는다. 스캔 원본의 90일 만료와 이전 버전 1일 추가 정리는 백엔드 `infra/terraform/storage.tf`, 서버 요청 기록 7일은 `infra/terraform/compute.tf`의 CloudWatch 설정을 근거로 한다. 기록 삭제·탈퇴는 현재 DB 행만 지우고 S3 원본은 즉시 지우지 않으므로 약관에도 만료일까지 남을 수 있다고 명시했다. 실제 배포 인프라의 S3 수명주기 및 로그 정책이 원고와 일치하는지 공개 전에 확인하고, 맞지 않으면 원고와 구현을 함께 수정한다. 현재 동의 API만으로 전체 개인정보 처리방침의 공개 의무가 끝나는 것은 아니다.
