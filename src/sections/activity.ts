// Activity — editorial "index of roles" (magazine contents list), 5 roles.
//
// C2: the four COMMITTEE rows each get a chibi guide (aki_ha_mini_*) standing in
// the row's own number column. Reading: each committee has its own little
// version of the companion showing you round it. The ambassador row (01) is the
// umbrella role rather than a committee, so it stays unaccompanied — which is
// also what keeps the four guides legible as "one per committee" instead of
// wallpaper. They are decorative (alt="") and sized so they never crowd the
// number or push the title off its baseline.
export const activityHTML = /* html */ `
  <div class="u-container">
    <div class="section__head">
      <h2 class="section-h" data-animate="split-h">活動</h2>
      <p class="lead" data-animate="reveal" style="margin-top:0.75rem;max-width:52ch;">
        全国から選ばれた31名のコミュニティアンバサダーの一人として、複数の委員会で運営に関わっています。
      </p>
    </div>

    <div class="roles">
      <div class="role" data-animate="activity-row">
        <span class="role__no">01</span>
        <div class="role__title">
          <span class="role__en">Community Ambassador</span>
          コミュニティアンバサダー
        </div>
        <p class="role__desc">
          Google AI 学生コミュニティの運営メンバー。学生同士が生成AIの活用アイデアを交換できる場を、企画と発信で盛り上げています。
        </p>
      </div>

      <div class="role" data-animate="activity-row">
        <span class="role__no">
          02
          <img class="role__guide" src="/assets/aki_ha_mini_blue.png" alt="" width="109" height="141" loading="lazy" decoding="async" />
        </span>
        <div class="role__title">
          <span class="role__en">Discord Committee</span>
          Discord特別委員会
        </div>
        <p class="role__desc">
          コミュニティの拠点である Discord サーバーの運営チーム。このメンバー紹介サイトの企画にも参加しています。
        </p>
      </div>

      <div class="role" data-animate="activity-row">
        <span class="role__no">
          03
          <img class="role__guide" src="/assets/aki_ha_mini_pink.png" alt="" width="106" height="140" loading="lazy" decoding="async" />
        </span>
        <div class="role__title">
          <span class="role__en">Vice Leader</span>
          遊び場委員会 副リーダー
        </div>
        <p class="role__desc">
          「まずは楽しく」を大事に、遊び心のある企画を<span class="nb">仕掛ける委員会。</span><span class="nb">副リーダーとして運営しています。</span>
        </p>
      </div>

      <div class="role" data-animate="activity-row">
        <span class="role__no">
          04
          <img class="role__guide role__guide--tall" src="/assets/aki_ha_mini_green.png" alt="" width="121" height="194" loading="lazy" decoding="async" />
        </span>
        <div class="role__title">
          <span class="role__en">Founder</span>
          西日本AI <span class="nb">Co-Innovation委員会</span> 創設・運営
        </div>
        <p class="role__desc">
          西日本の学生がつながり、一緒にAI活用を試せる場をゼロから立ち上げました。地域を越えた共創を目指しています。
        </p>
      </div>

      <div class="role" data-animate="activity-row">
        <span class="role__no">
          05
          <img class="role__guide" src="/assets/aki_ha_mini_yellow.png" alt="" width="112" height="142" loading="lazy" decoding="async" />
        </span>
        <div class="role__title">
          <span class="role__en">Tech Hub</span>
          <span class="nb">Google AI Tech Hub</span>
        </div>
        <p class="role__desc">
          技術好きのメンバーが集まる Tech Hub に所属し、開発ネタや検証結果を共有してきました。
        </p>
      </div>
    </div>
  </div>
`
