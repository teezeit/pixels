import gradio as gr
import pandas as pd
import json
import plotly.graph_objs as go
from plotly.subplots import make_subplots


def plot_dataframe(df: pd.DataFrame, *config) -> go.Figure:
    plot_title = config[0]
    subplot_title = config[1]
    reference_line = config[3]
    markercolor = config[4]
    markeroutlinecolor = config[5]
    linecolor = config[6]
    years_to_plot = config[7]

    if df is None:
        return None
    # Filter the DataFrame for the selected years
    num_years = df.index.year.nunique()
    if num_years == 0:
        return None
    if years_to_plot is None:
        return None

    # Create a DataFrame with the full date range
    full_date_range = pd.date_range(start=df.index.min(), end=df.index.max())
    full_df = pd.DataFrame(index=full_date_range)
    # Merge with the original DataFrame
    df = full_df.merge(df, left_index=True, right_index=True, how="left")

    df = df[df.index.year.isin([int(year) for year in years_to_plot])]

    num_years = df.index.year.nunique()
    if num_years == 0:
        return None
    unique_years = df.index.year.unique()

    fig = make_subplots(
        rows=num_years,
        cols=1,
        # shared_xaxes=True,
        # vertical_spacing=0.1* num_years,
        subplot_titles=[f"{year} {subplot_title}" for year in unique_years],
    )

    # Standardize the year for all dates in the x-axis range
    x_axis_range = pd.date_range(start="2000-01-01", end="2000-12-31")

    for i, year in enumerate(unique_years):
        # Filter the DataFrame for the year
        df_year = df[df.index.year == year]

        # Standardize the year in df_year's index for plotting
        df_year.index = df_year.index.map(lambda d: d.replace(year=2000))

        # Add the trace for the year
        fig.add_trace(
            go.Scatter(
                x=df_year.index,
                y=df_year["rolling_avg"],
                mode="lines+markers",
                name=f"{year} {subplot_title}",
                line=dict(color=linecolor, width=2),
                marker=dict(
                    size=6,
                    symbol="circle",
                    color=markercolor,
                    line=dict(width=2, color=markeroutlinecolor),
                ),
                opacity=0.8,
                connectgaps=False,
            ),
            row=i + 1,
            col=1,
        )
        # fig.update_traces(connectgaps=False)
        # Add a horizontal line for the mean

        fig.add_hline(
            y=df["rolling_avg"].mean(),
            line=dict(color="black", width=2),
            row=i + 1,
            col=1,
        )

        if reference_line:
            fig.add_hline(
                y=reference_line,
                line=dict(color="black", dash="dash", width=1),
                row=i + 1,
                col=1,
            )
        fig.update_yaxes(
            range=[0.75, 5.25],
            title_text="Mood Score",
            showgrid=True,
            gridcolor="lightgrey",
            # row=1,
            row=i + 1,
            col=1,
        )
        # Update x-axis and y-axis properties
        fig.update_xaxes(
            range=[x_axis_range[0], x_axis_range[-1]],
            tickformat="%b",
            title_text="Month",
            showgrid=True,
            gridcolor="lightgrey",
            row=i + 1,
            col=1,
        )

    # Update layout for better spacing and aesthetics
    fig.update_layout(
        height=300 * num_years,
        showlegend=False,
        title=plot_title,
        title_font_size=20,
        margin=dict(l=50, r=50, t=80, b=80),
        plot_bgcolor="white",
    )

    return fig

def read_file_to_dataframe(filename: str) -> pd.DataFrame:
    with open(filename) as file:
        data = json.load(file)
    df = pd.DataFrame({"date_str": x["date"], "score": x["scores"][0]} for x in data)
    return df


def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df["date"] = pd.to_datetime(df["date_str"])
    df.set_index("date", inplace=True)
    return df


def calculate_rolling_avg(df: pd.DataFrame, config: str) -> pd.DataFrame:
    df["rolling_avg"] = df["score"].rolling(config, min_periods=1).mean()
    return df


def read_file_process_and_plot(filename, *config):
    # Read File
    if filename is None:
        return None
    df = read_file_to_dataframe(filename)
    # preprocessing
    df = preprocess_dataframe(df)
    # do some calculations
    # breakpoint()
    days_moving_window = config[2]
    rolling_average_window = f"{days_moving_window}D"
    df = calculate_rolling_avg(df, rolling_average_window)
    # plot the data
    fig = plot_dataframe(df, *config)
    return fig


def extract_years_from_file(filename: str):
    if not filename:
        return gr.Dropdown(choices=[], value=[])
    df = read_file_to_dataframe(filename)
    df = preprocess_dataframe(df)
    years = df.index.year.unique().tolist()
    years = [str(year) for year in years]

    return gr.Dropdown(choices=years, value=years)


def set_file_to_sample_data():
    filename = "mock_pixels_data.json"
    return filename


def button_hide():
    return gr.Button(visible=False)


css = """
h1 {
    text-align: center;
    display:block;
}
"""
with gr.Blocks(css=css) as demo:
    gr.Markdown("# Pixels Year Plotting")
    gr.Markdown(
        "## Export your data from the Pixels App. Upload it here to visualize your mood over time."
    )

    with gr.Row():
        with gr.Column():
            filename = gr.File(file_types=[".json"], label="Upload JSON File")
            button = gr.Button(value="Try Sample Data")
            with gr.Row(visible=False) as config_row:
                with gr.Column():
                    with gr.Row():
                        plot_title = gr.Textbox(
                            label="Plot Title", value="Yearly 7 day running average"
                        )
                        subplot_title = gr.Textbox(
                            label="Plot Title", value="Running average"
                        )
                        years_to_plot = gr.Dropdown(
                            choices=[], label="Years to Plot", multiselect=True
                        )
                    with gr.Row():
                        days_moving_window = gr.Slider(
                            minimum=1,
                            maximum=30,
                            value=7,
                            step=1,
                            label="Days for Running Average Window",
                        )
                        reference_line = gr.Slider(
                            minimum=1,
                            maximum=5,
                            value=3,
                            step=0.1,
                            label="Second Reference Line [default=3][blue is mean]",
                        )
                    with gr.Row():
                        markercolor = gr.ColorPicker(
                            label="Marker Color",
                            value="crimson",
                        )
                        markeroutlinecolor = gr.ColorPicker(
                            label="Marker Outline Color", value="royalblue"
                        )
                        linecolor = gr.ColorPicker(
                            label="Line Color", value="royalblue"
                        )

    with gr.Row():
        plot_output = gr.Plot()

    def toggle_slider_row_visibility(file_obj):
        # reference_line = None
        if file_obj is None:
            return gr.Row.update(visible=False)

        return gr.Row.update(visible=True)

    # def update_plot(*args):
    #     return read_file_process_and_plot(*args)

    change = dict(
        fn=read_file_process_and_plot,
        inputs=[
            filename,
            plot_title,
            subplot_title,
            days_moving_window,
            reference_line,
            markercolor,
            markeroutlinecolor,
            linecolor,
            years_to_plot,
        ],
        outputs=plot_output,
    )

    # Show the config row only when the file is uploaded
    filename.change(
        fn=toggle_slider_row_visibility, inputs=[filename], outputs=config_row
    )
    filename.change(**change)
    # Update years dropdown when file is uploaded
    filename.change(
        fn=extract_years_from_file, inputs=[filename], outputs=years_to_plot
    )
    button.click(fn=set_file_to_sample_data, outputs=filename)
    button.click(fn=button_hide, outputs=button)
    # filename.change(**change)
    days_moving_window.change(**change)
    reference_line.change(**change)
    plot_title.change(**change)
    subplot_title.change(**change)
    markercolor.change(**change)
    markeroutlinecolor.change(**change)
    linecolor.change(**change)
    years_to_plot.change(**change)


demo.launch()
